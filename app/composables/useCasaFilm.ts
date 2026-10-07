const FRAME_COUNT = 1575
const LERP_FACTOR = 0.12
const MAX_DPR = 1.5
const INITIAL_CHUNK = 1000
const INITIAL_CONCURRENCY = 12
const BACKGROUND_CONCURRENCY = 4
const SCROLL_QUIET_MS = 180
const DECODE_AHEAD = 36
const DECODE_BEHIND = 12
const EVICT_MARGIN = 12
const MAX_DECODES = 4
const INTRO_FADE_END = 0.025
const TITLE_FADE_START = 0.87
const TITLE_FADE_LENGTH = 0.05

function framePath(index: number): string {
  return `/casa/frames/f_${String(index + 1).padStart(4, '0')}.webp`
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function defined<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error('Casa film is missing a required element.')
  }

  return value
}

const frameBlobs: Array<Blob | undefined> = Array.from({ length: FRAME_COUNT })
const frameLoads = new Map<number, Promise<void>>()
let contiguousLoaded = 0
let filmMounted = false
let lastFilmScrollAt = 0
let backgroundPreload: Promise<void> | null = null

function advanceContiguous(): void {
  while (frameBlobs[contiguousLoaded]) {
    contiguousLoaded += 1
  }
}

function initialChunkReady(): boolean {
  for (let index = 0; index < INITIAL_CHUNK; index += 1) {
    if (!frameBlobs[index]) {
      return false
    }
  }

  return true
}

function loadFrame(index: number): Promise<void> {
  if (frameBlobs[index]) {
    return Promise.resolve()
  }

  const pending = frameLoads.get(index)

  if (pending) {
    return pending
  }

  const job = fetch(framePath(index))
    .then(async (response) => {
      if (response.ok) {
        frameBlobs[index] = await response.blob()
      }
    })
    .catch(() => {
      // A missing frame should not stall the rest.
    })
    .finally(() => {
      frameLoads.delete(index)
      advanceContiguous()
    })

  frameLoads.set(index, job)

  return job
}

function filmIsScrolling(): boolean {
  return filmMounted && performance.now() - lastFilmScrollAt < SCROLL_QUIET_MS
}

async function preloadRange(from: number, to: number, options: {
  concurrency: number
  onProgress?: (progress: number) => void
  yieldToScroll?: boolean
  shouldContinue?: () => boolean
}): Promise<void> {
  const total = to - from
  let settled = 0

  for (let index = from; index < to; index += 1) {
    if (frameBlobs[index]) {
      settled += 1
    }
  }

  if (total > 0) {
    options.onProgress?.(settled / total)
  }

  let next = from

  async function worker(): Promise<void> {
    while ((options.shouldContinue?.() ?? true) && next < to) {
      if (options.yieldToScroll) {
        while ((options.shouldContinue?.() ?? true) && filmIsScrolling()) {
          await wait(SCROLL_QUIET_MS)
        }
      }

      if (!(options.shouldContinue?.() ?? true) || next >= to) {
        return
      }

      const index = next
      next += 1

      if (frameBlobs[index]) {
        continue
      }

      await loadFrame(index)

      if (!(options.shouldContinue?.() ?? true)) {
        return
      }

      settled += 1
      options.onProgress?.(settled / total)
    }
  }

  await Promise.all(Array.from({ length: options.concurrency }, () => worker()))
}

function ensureBackgroundPreload(): void {
  if (backgroundPreload) {
    return
  }

  backgroundPreload = preloadRange(INITIAL_CHUNK, FRAME_COUNT, {
    concurrency: BACKGROUND_CONCURRENCY,
    yieldToScroll: true
  })
}

export function useCasaFilm(refs: {
  hero: Ref<HTMLElement | null>
  canvas: Ref<HTMLCanvasElement | null>
  loader: Ref<HTMLElement | null>
  loaderFill: Ref<HTMLElement | null>
  loaderPercent: Ref<HTMLElement | null>
  heroBrand: Ref<HTMLElement | null>
  heroScrim: Ref<HTMLElement | null>
  heroTitle: Ref<HTMLElement | null>
  scrollHint: Ref<HTMLElement | null>
  gallery: Ref<HTMLElement | null>
  galleryTrack: Ref<HTMLElement | null>
}): void {
  let alive = true
  let dispose = (): void => {}

  onBeforeUnmount(() => {
    alive = false
    filmMounted = false
    dispose()
  })

  onMounted(() => {
    filmMounted = true

    const hero = defined(refs.hero.value)
    const canvas = defined(refs.canvas.value)
    const loader = defined(refs.loader.value)
    const loaderFill = defined(refs.loaderFill.value)
    const loaderPercent = defined(refs.loaderPercent.value)
    const heroBrand = defined(refs.heroBrand.value)
    const heroScrim = defined(refs.heroScrim.value)
    const heroTitle = defined(refs.heroTitle.value)
    const scrollHint = defined(refs.scrollHint.value)
    const gallery = refs.gallery.value
    const galleryTrack = refs.galleryTrack.value
    const context = defined(canvas.getContext('2d', { alpha: false }))

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const bitmaps = new Map<number, ImageBitmap>()
    const decoding = new Set<number>()
    const stops: Array<() => void> = []
    const styleCache = new WeakMap<HTMLElement, Record<string, string>>()

    let currentFrame = 0
    let renderedFrame = -1
    let direction = 1
    let windowStart = 0
    let windowEnd = 0
    let heroVisible = true
    let running = false
    let viewportW = 0
    let viewportH = 0
    let raf = 0

    function stop(fn: () => void): void {
      stops.push(fn)
    }

    dispose = () => {
      cancelAnimationFrame(raf)
      document.body.style.overflow = ''

      for (const bitmap of bitmaps.values()) {
        bitmap.close()
      }

      bitmaps.clear()

      for (const fn of stops) {
        fn()
      }
    }

    function resizeCanvas(): void {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      const width = canvas.clientWidth
      const height = canvas.clientHeight

      if (!width || !height) {
        return
      }

      const bitmapW = Math.round(width * dpr)
      const bitmapH = Math.round(height * dpr)

      if (canvas.width === bitmapW && canvas.height === bitmapH) {
        return
      }

      viewportW = width
      viewportH = height
      canvas.width = bitmapW
      canvas.height = bitmapH
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      renderedFrame = -1
      renderFrame()
    }

    function drawIndex(): number {
      return clamp(Math.round(currentFrame), 0, Math.max(0, contiguousLoaded - 1))
    }

    function nearestDecoded(index: number): number {
      if (bitmaps.has(index)) {
        return index
      }

      for (let distance = 1; distance <= DECODE_AHEAD; distance += 1) {
        if (bitmaps.has(index - distance * direction)) {
          return index - distance * direction
        }

        if (bitmaps.has(index + distance * direction)) {
          return index + distance * direction
        }
      }

      return -1
    }

    function drawFrame(index: number): void {
      const image = bitmaps.get(index)

      if (!image) {
        return
      }

      const scale = Math.max(viewportW / image.width, viewportH / image.height)
      const width = image.width * scale
      const height = image.height * scale
      const x = (viewportW - width) / 2
      const y = (viewportH - height) / 2

      context.clearRect(0, 0, viewportW, viewportH)
      context.drawImage(image, x, y, width, height)
      renderedFrame = index
    }

    function renderFrame(): void {
      const index = nearestDecoded(drawIndex())

      if (index !== -1 && index !== renderedFrame) {
        drawFrame(index)
      }
    }

    function isWanted(index: number): boolean {
      return index >= windowStart - EVICT_MARGIN && index <= windowEnd + EVICT_MARGIN
    }

    function decodeFrame(index: number): void {
      const blob = frameBlobs[index]

      if (!blob) {
        return
      }

      decoding.add(index)
      createImageBitmap(blob)
        .then((bitmap) => {
          if (!alive) {
            bitmap.close()
            return
          }

          if (isWanted(index)) {
            bitmaps.set(index, bitmap)
          } else {
            bitmap.close()
          }
        })
        .catch(() => {
          // A broken frame should not stop the film.
        })
        .finally(() => {
          decoding.delete(index)
        })
    }

    function updateWindow(center: number): void {
      const ahead = direction > 0 ? DECODE_AHEAD : DECODE_BEHIND
      const behind = direction > 0 ? DECODE_BEHIND : DECODE_AHEAD
      windowStart = Math.max(0, center - behind)
      windowEnd = Math.min(FRAME_COUNT - 1, center + ahead)

      for (const [index, bitmap] of bitmaps) {
        if (!isWanted(index)) {
          bitmap.close()
          bitmaps.delete(index)
        }
      }

      const reach = Math.max(ahead, behind)

      for (let distance = 0; distance <= reach && decoding.size < MAX_DECODES; distance += 1) {
        for (const index of [center + distance * direction, center - distance * direction]) {
          if (decoding.size >= MAX_DECODES) {
            break
          }

          if (index < windowStart || index > windowEnd) {
            continue
          }

          if (!frameBlobs[index] || bitmaps.has(index) || decoding.has(index)) {
            continue
          }

          decodeFrame(index)
        }
      }
    }

    async function warmWindow(center: number): Promise<void> {
      updateWindow(center)
      const jobs: Array<Promise<void>> = []

      for (let index = windowStart; index <= windowEnd; index += 1) {
        const blob = frameBlobs[index]

        if (!blob || bitmaps.has(index) || decoding.has(index)) {
          continue
        }

        jobs.push(
          createImageBitmap(blob)
            .then((bitmap) => {
              if (!alive) {
                bitmap.close()
                return
              }

              bitmaps.set(index, bitmap)
            })
            .catch(() => {
              // A broken frame should not stop the film.
            })
        )
      }

      await Promise.all(jobs)
    }

    function rawProgress(): number {
      const scrollable = hero.offsetHeight - window.innerHeight

      if (scrollable <= 0) {
        return 0
      }

      return clamp(window.scrollY / scrollable, 0, 1)
    }

    function setStyle(el: HTMLElement, prop: string, value: string): void {
      let cache = styleCache.get(el)

      if (!cache) {
        cache = {}
        styleCache.set(el, cache)
      }

      if (cache[prop] === value) {
        return
      }

      cache[prop] = value
      el.style.setProperty(prop, value)
    }

    function updateOverlay(progress: number): void {
      const introOpacity = 1 - clamp(progress / INTRO_FADE_END, 0, 1)
      const titleOpacity = clamp((progress - TITLE_FADE_START) / TITLE_FADE_LENGTH, 0, 1)
      const textOpacity = Math.max(introOpacity, titleOpacity)

      setStyle(heroBrand, 'opacity', textOpacity.toFixed(3))
      setStyle(scrollHint, 'opacity', introOpacity.toFixed(3))
      setStyle(heroTitle, 'opacity', titleOpacity.toFixed(3))
      setStyle(heroTitle, 'transform', `translateY(${((1 - titleOpacity) * 24).toFixed(1)}px)`)
      setStyle(heroScrim, 'opacity', textOpacity.toFixed(3))
    }

    function tick(): void {
      if (!alive || !heroVisible) {
        running = false
        return
      }

      const progress = rawProgress()
      const targetFrame = progress * (FRAME_COUNT - 1)
      const delta = targetFrame - currentFrame

      if (Math.abs(delta) > 0.5) {
        direction = delta > 0 ? 1 : -1
      }

      currentFrame += delta * LERP_FACTOR

      if (Math.abs(targetFrame - currentFrame) < 0.02) {
        currentFrame = targetFrame
      }

      updateWindow(drawIndex())
      renderFrame()
      updateOverlay(progress)
      raf = requestAnimationFrame(tick)
    }

    function startLoop(): void {
      if (running || !alive) {
        return
      }

      running = true
      raf = requestAnimationFrame(tick)
    }

    function setupGallery(): void {
      if (!gallery || !galleryTrack) {
        return
      }

      const videos = Array.from(gallery.querySelectorAll('video'))

      const centerMain = (): void => {
        const main = galleryTrack.querySelector('.casa-gallery-card--main')

        if (!(main instanceof HTMLElement) || galleryTrack.scrollWidth <= galleryTrack.clientWidth) {
          return
        }

        galleryTrack.scrollLeft = main.offsetLeft - (galleryTrack.clientWidth - main.offsetWidth) / 2
      }

      centerMain()

      const onOrientation = (): void => {
        requestAnimationFrame(centerMain)
      }

      window.addEventListener('orientationchange', onOrientation)
      stop(() => window.removeEventListener('orientationchange', onOrientation))

      if (reducedMotion || !('IntersectionObserver' in window)) {
        return
      }

      const observer = new IntersectionObserver(([entry]) => {
        if (!entry) {
          return
        }

        for (const video of videos) {
          if (entry.isIntersecting) {
            video.play().catch(() => {
              // Autoplay can be refused; the poster stays.
            })
          } else {
            video.pause()
          }
        }
      }, { rootMargin: '200px 0px' })

      observer.observe(gallery)
      stop(() => observer.disconnect())
    }

    async function init(): Promise<void> {
      resizeCanvas()

      if ('ResizeObserver' in window) {
        const observer = new ResizeObserver(resizeCanvas)
        observer.observe(canvas)
        stop(() => observer.disconnect())
      }

      const onResize = (): void => {
        resizeCanvas()
      }

      window.addEventListener('resize', onResize)
      window.addEventListener('orientationchange', onResize)
      stop(() => {
        window.removeEventListener('resize', onResize)
        window.removeEventListener('orientationchange', onResize)
      })

      if (initialChunkReady()) {
        loader.classList.add('casa-loader--hidden')
      }

      await loadFrame(0)

      if (!alive) {
        return
      }

      await warmWindow(0)
      renderFrame()

      if (!alive) {
        return
      }

      if (reducedMotion) {
        heroTitle.style.opacity = '1'
        heroTitle.style.transform = 'none'
        heroScrim.style.opacity = '1'
        loader.classList.add('casa-loader--hidden')
        return
      }

      if (!initialChunkReady()) {
        document.body.style.overflow = 'hidden'

        await preloadRange(1, INITIAL_CHUNK, {
          concurrency: INITIAL_CONCURRENCY,
          shouldContinue: () => alive,
          onProgress: (progress) => {
            const pct = Math.round(progress * 100)
            loaderFill.style.width = `${pct}%`
            loaderPercent.textContent = `${pct}%`
          }
        })

        if (!alive) {
          document.body.style.overflow = ''
          return
        }
      }

      currentFrame = rawProgress() * (FRAME_COUNT - 1)
      await warmWindow(drawIndex())
      renderFrame()

      if (!alive) {
        document.body.style.overflow = ''
        return
      }

      document.body.style.overflow = ''
      loader.classList.add('casa-loader--hidden')

      const onScroll = (): void => {
        lastFilmScrollAt = performance.now()
      }

      window.addEventListener('scroll', onScroll, { passive: true })
      stop(() => window.removeEventListener('scroll', onScroll))

      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(([entry]) => {
          heroVisible = entry?.isIntersecting ?? false

          if (heroVisible) {
            startLoop()
          }
        })
        observer.observe(hero)
        stop(() => observer.disconnect())
      }

      startLoop()
      ensureBackgroundPreload()
    }

    setupGallery()
    void init()
  })
}
