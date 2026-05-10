const showFuture = new URLSearchParams(window.location.search).has('future')
const swapUrl = new URL(window.location.href)
if (showFuture) {
  swapUrl.searchParams.delete('future')
} else {
  swapUrl.searchParams.set('future', 'true')
}

const mediaForDarkMode = window.matchMedia('(prefers-color-scheme: dark)')

function getStyleForMode(isDarkMode) {
  return isDarkMode
    ? 'https://osm-assets.coveragetiles.com/modern_rail_dark.min.json'
    : 'https://osm-assets.coveragetiles.com/modern_rail_light.min.json'
}

const map = new maplibregl.Map({
  container: 'map',
  // Comment the line below and uncomment the line below that to use the free OSM raster tile service
  style: getStyleForMode(mediaForDarkMode.matches),
  // style: '/map-styles/osm-raster.json',
  center: [4.39097, 54.64657],
  zoom: 12,
  maxZoom: 18,
  minZoom: 3,
  dragRotate: false,
  touchPitch: false,
  pitchWithRotate: false,
  boxZoom: false,
  attributionControl: false,
})
  .addControl(
    new maplibregl.AttributionControl({
      customAttribution: [
        `<a href="${swapUrl.toString()}">${showFuture ? 'Hide' : 'Show'} future stations</a>`,
        `<a href="https://github.com/davwheat/visited-stations-map">View source code</a>`,
        `Inspired by <a href="https://github.com/t5r7/station-mapper">t5r7's station mapper</a>`,
        `<a target="_blank" href="https://docs.google.com/spreadsheets/d/1ZRBE-9i4_WmMmO5h1pIMwrF1owW95Qc-ElLcmf0ct3g/edit">Data source</a>`,
        '© OpenStreetMap contributors',
      ],
    }),
  )
  .addControl(
    new maplibregl.ScaleControl({
      maxWidth: 140,
      unit: 'metric',
    }),
  )

mediaForDarkMode.addEventListener('change', ({ matches }) => {
  map.setStyle(getStyleForMode(matches))
})

map.touchZoomRotate.disableRotation()

// When styles loaded
map.on('load', () => {
  map.getContainer().classList.add('loaded')
})

/** @type {Record<string, string>} */
const groups = {}

/**
 * @typedef {Object} Station
 * @property {number} lat
 * @property {number} lon
 * @property {string} stationName
 * @property {string} stationNameEnglish
 * @property {string} stationCode
 * @property {string | null} visitedDate
 * @property {string} brand
 * @property {string} countryCode
 * @property {string} countryName
 * @property {string} type
 * @property {boolean} isFuture
 */

/**
 * @returns {Promise<Station[]>}
 */
async function getData() {
  try {
    const response = await fetch('/api/stations')
    const data = await response.json()

    const stations = data.stations

    if (Array.isArray(stations)) {
      return stations
    }
  } catch (error) {
    console.error(error)
    alert('Failed to load stations data. Please refresh the page, or try again later.')
    throw error
  }
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const bounds = new maplibregl.LngLatBounds()

document.addEventListener('DOMContentLoaded', async () => {
  const stations = await getData()

  stations.forEach(stn => {
    const nativeName = stn.stationName
    const englishName = stn.stationNameEnglish || null

    if (stn.isFuture && !showFuture) {
      return
    }

    // https://stackoverflow.com/a/37511463
    const normalisedBrand = stn.brand
      .normalize('NFKD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
    const countryCodeEnc = encodeURIComponent(stn.countryCode.toLowerCase())
    const cleanType = stn.type.toLowerCase().replace(/[^a-z]/g, '-')
    const brandBg =
      cleanType === 'heritage-railway'
        ? `url('/brands/steam-train.svg')`
        : `url('/brands/${countryCodeEnc}/${encodeURIComponent(normalisedBrand)}.svg'), url('/brands/${countryCodeEnc}/${encodeURIComponent(normalisedBrand)}.png')`

    const iconEl = document.createElement('div')
    iconEl.className = 'station-icon'
    iconEl.style.backgroundImage = brandBg
    iconEl.setAttribute('data-mode-type', cleanType)

    const el = document.createElement('div')
    el.appendChild(iconEl)
    el.className = 'station-marker'
    el.setAttribute('data-mode-type', cleanType)
    el.setAttribute('data-brand', normalisedBrand)
    el.setAttribute('data-future', stn.isFuture)

    if (!(cleanType in groups)) {
      groups[cleanType] = stn.type
    }

    const popup = new maplibregl.Popup({
      offset: 25,
    }).setHTML(
      `
<h2 class="name">${nativeName}${stn.stationCode ? ` <span class="code">[${stn.stationCode}]</span>` : ''}</h2>
${englishName ? `<p class="name-en">${stn.stationNameEnglish}</p>` : ''}
<p class="country"><img class="country-flag" src="/flags/${countryCodeEnc}.svg"> ${stn.countryName}</p>

<p class="brand"> <span class="brand-icon" style="background-image: ${brandBg}"></span> ${stn.brand}</p>

<p data-mode-type="${cleanType}" class="type">${stn.type}</p>

${stn.visitedDate ? `<p class="visited ${stn.isFuture ? 'to-visit' : ''}">${stn.isFuture ? 'Planned to visit' : 'First visited'} ${dateFormatter.format(new Date(stn.visitedDate))}</p>` : ''}
      `,
    )

    new maplibregl.Marker({
      element: el,
    })
      .setLngLat([stn.lng, stn.lat])
      .setPopup(popup)
      .addTo(map)

    // Update bounds
    bounds.extend([stn.lng, stn.lat])
  })

  let coordPopup = null

  map.on('contextmenu', function (e) {
    var coordinates = e.lngLat

    if (coordPopup !== null) {
      coordPopup.remove()
    }

    coordPopup = new maplibregl.Popup()
      .setLngLat(coordinates)
      .setHTML(`<p style="margin:0">${coordinates.lat.toFixed(5)},${coordinates.lng.toFixed(5)}</p>`)
      .addTo(map)
  })

  // Fit map to bounds
  map.fitBounds(bounds, {
    padding: 50,
    speed: 1.2,
  })

  setUpFilters()

  const overlay = document.getElementById('overlay')

  // Remove from DOM when fade out is complete
  overlay.addEventListener('transitionend', () => {
    overlay.remove()
  })

  overlay.classList.add('hidden')
  overlay.style.pointerEvents = 'none'
})

function setUpFilters() {
  const filterGroup = document.getElementById('filter-group')

  for (const [cleanType, type] of Object.entries(groups)) {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.className = 'filter-checkbox'
    input.id = cleanType
    input.checked = true

    const label = document.createElement('label')
    label.htmlFor = cleanType
    label.appendChild(input)
    label.appendChild(document.createTextNode(` ${type}`))

    const onlyButton = document.createElement('button')
    onlyButton.textContent = 'only'
    onlyButton.className = 'only'
    onlyButton.addEventListener('click', () => {
      const checkboxes = document.querySelectorAll('.filter-checkbox')
      checkboxes.forEach(checkbox => {
        checkbox.checked = false
      })

      input.checked = true
      updateStyles()
    })

    const group = document.createElement('div')
    group.className = 'filter-group-row'
    group.appendChild(label)
    group.appendChild(onlyButton)

    filterGroup.appendChild(group)

    input.addEventListener('change', () => {
      updateStyles()
    })
  }

  updateStyles()
}

function updateStyles() {
  const filterCheckboxes = document.querySelectorAll('.filter-checkbox')

  const hiddenStyles = []

  filterCheckboxes.forEach(checkbox => {
    const cleanType = checkbox.id
    const checked = checkbox.checked

    if (!checked) {
      hiddenStyles.push(cleanType)
    }
  })

  document.getElementById('map').setAttribute('data-hidden-types', `,${hiddenStyles.join(',')},`)
}
