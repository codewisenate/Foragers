// Navigation mobile toggle
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.getElementById('nav-menu');

if (navToggle && navMenu) {
	navToggle.addEventListener('click', () => {
		const isOpen = navMenu.classList.contains('open');
		navMenu.classList.toggle('open');
		navToggle.setAttribute('aria-expanded', String(!isOpen));
	});

	// Close nav when clicking outside
	document.addEventListener('click', (e) => {
		if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
			navMenu.classList.remove('open');
			navToggle.setAttribute('aria-expanded', 'false');
		}
	});

	// Close nav on Escape key
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && navMenu.classList.contains('open')) {
			navMenu.classList.remove('open');
			navToggle.setAttribute('aria-expanded', 'false');
			navToggle.focus();
		}
	});
}

// ---- Weather helpers ----

const WEATHER_ICON_BASE = '/assets/weather';
const DIRECTION_ICON_URL = `${WEATHER_ICON_BASE}/direction.svg`;

// Map Open-Meteo WMO codes → Meteocons filenames
function getMeteocon(weatherCode, isDay) {
	if (weatherCode === 0) return `clear-${isDay ? 'day' : 'night'}.svg`;
	if ([1, 2].includes(weatherCode)) return `partly-cloudy-${isDay ? 'day' : 'night'}.svg`;
	if (weatherCode === 3) return 'cloudy.svg';
	if ([45, 48].includes(weatherCode)) return 'fog.svg';
	if ([51, 53, 55, 56, 57].includes(weatherCode)) return 'drizzle.svg';
	if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) return 'rain.svg';
	if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return 'snow.svg';
	if ([95, 96, 99].includes(weatherCode)) return 'thunderstorms.svg';
	return 'cloudy.svg';
}

function weatherLabelFromCode(code) {
	if (code === 0) return 'Clear sky';
	if ([1, 2, 3].includes(code)) return 'Cloudy';
	if ([45, 48].includes(code)) return 'Fog';
	if ([51, 53, 55].includes(code)) return 'Drizzle';
	if ([56, 57].includes(code)) return 'Freezing drizzle';
	if ([61, 63, 65].includes(code)) return 'Rain';
	if ([66, 67].includes(code)) return 'Freezing rain';
	if ([71, 73, 75].includes(code)) return 'Snow';
	if (code === 77) return 'Snow grains';
	if ([80, 81, 82].includes(code)) return 'Rain showers';
	if ([85, 86].includes(code)) return 'Snow showers';
	if (code === 95) return 'Thunderstorm';
	if ([96, 99].includes(code)) return 'Thunderstorm with hail';
	return 'Unknown conditions';
}

function getWindDirection(degrees) {
	if (typeof degrees !== 'number') return '';
	const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
	const index = Math.round(degrees / 45) % 8;
	return directions[index];
}

async function getWeather(lat, lon) {
	const url =
		`https://api.open-meteo.com/v1/forecast` +
		`?latitude=${lat}` +
		`&longitude=${lon}` +
		`&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,is_day` +
		`&temperature_unit=celsius&wind_speed_unit=kmh`;

	const res = await fetch(url);
	if (!res.ok) throw new Error('Weather fetch failed');

	const data = await res.json();

	const windDeg = data.current.wind_direction_10m;

	return {
		temp_c: data.current.temperature_2m,
		feels_like_c: data.current.apparent_temperature,
		wind_kph: data.current.wind_speed_10m,
		wind_deg: typeof windDeg === 'number' ? windDeg : Number(windDeg),
		wind_dir: getWindDirection(typeof windDeg === 'number' ? windDeg : Number(windDeg)),
		weather_code: data.current.weather_code,
		is_day: data.current.is_day === 1,
		updated_at: data.current.time
	};
}

// Foragers, Roberts Creek, BC (approx)
async function loadWeather() {
	const weather = await getWeather(49.41, -123.58);

	const el = document.getElementById('weather');
	if (!el) return;

	const iconFile = getMeteocon(weather.weather_code, weather.is_day);
	const iconUrl = `${WEATHER_ICON_BASE}/${iconFile}`;
	const label = weatherLabelFromCode(weather.weather_code);

	// Normalize just in case (keeps it 0–359)
	const rot = Number.isFinite(weather.wind_deg) ? ((weather.wind_deg % 360) + 360) % 360 : 0;

	el.innerHTML = `
		<div class="weather-widget" style="display:flex;gap:.75rem;align-items:center;">
			<div>
				<div>
					<span>
						<img
							src="${iconUrl}"
							alt="${label}"
							width="22"
							height="22"
							style="position: relative; top: 4px;"
						/> ${label} • <strong aria-hidden="true" style="letter-spacing: -1px">${weather.temp_c}</strong>ºC
					</span>
				</div>

				<div>
					Wind ${weather.wind_kph} <small>km/h</small><img
						src="${DIRECTION_ICON_URL}"
						alt=""
						aria-hidden="true"
						width="12"
						height="12"
						style="
							display:inline-block;
							margin:0 .25rem 0 .4rem;
							transform: rotate(${rot}deg);
							transform-origin: 50% 50%;
						"
					/><small>${weather.wind_dir}</small>
				</div>
			</div>
		</div>
	`;
}

loadWeather().catch(console.error);