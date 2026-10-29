
const form = document.getElementById("search-form");
const input = document.getElementById("city-input");
const button = document.getElementById("search-btn");
const message = document.getElementById("message");
const weatherSection = document.getElementById("weather-section");
const emptyState = document.getElementById("empty-state");

// Search city
form.addEventListener("submit", function (event) {
    event.preventDefault();
    searchWeather(input.value.trim());
});

// Quick city buttons
document.querySelectorAll(".city-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
        const city = chip.dataset.city;
        input.value = city;
        searchWeather(city);
    });
});

async function searchWeather(city) {
    if (!city) {
        message.textContent = "Please enter a city name.";
        return;
    }

    button.disabled = true;
    button.textContent = "Loading...";
    message.textContent = `Exploring weather in ${city}...`;

    try {
        // 1. Find the city coordinates
        const geoURL =
            "https://geocoding-api.open-meteo.com/v1/search?" +
            new URLSearchParams({
                name: city,
                count: 1,
                language: "en",
                format: "json"
            });

        const geoResponse = await fetch(geoURL);

        if (!geoResponse.ok) {
            throw new Error("City search failed. Try again.");
        }

        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error("City not found. Check the spelling.");
        }

        const place = geoData.results[0];

        // 2. Get current weather and 5-day forecast
        const params = new URLSearchParams({
            latitude: place.latitude,
            longitude: place.longitude,
            current: [
                "temperature_2m",
                "relative_humidity_2m",
                "apparent_temperature",
                "weather_code",
                "wind_speed_10m",
                "precipitation"
            ].join(","),
            daily: [
                "weather_code",
                "temperature_2m_max",
                "temperature_2m_min"
            ].join(","),
            timezone: "auto",
            forecast_days: "5"
        });

        const weatherResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?${params}`
        );

        if (!weatherResponse.ok) {
            throw new Error("Weather data unavailable. Try again.");
        }

        const data = await weatherResponse.json();

        if (!data.current || !data.daily) {
            throw new Error("Incomplete weather data received.");
        }

        // 3. Display weather
        displayWeather(place, data);

        weatherSection.classList.remove("hidden");
        emptyState.classList.add("hidden");
        message.textContent =
            `Weather loaded for ${place.name}.`;

    } catch (error) {
        message.textContent =
            error.message || "Something went wrong. Try again.";
    } finally {
        button.disabled = false;
        button.textContent = "Search";
    }
}


// Weather codes to readable conditions
function getWeatherInfo(code, isDay = 1) {
    if (code === 0) {
        return isDay
            ? { text: "Clear sky", icon: "☀️" }
            : { text: "Clear night", icon: "🌙" };
    }

    if ([1, 2, 3].includes(code)) {
        return { text: "Partly cloudy", icon: "⛅" };
    }

    if ([45, 48].includes(code)) {
        return { text: "Foggy", icon: "🌫️" };
    }

    if ([51, 53, 55, 56, 57].includes(code)) {
        return { text: "Drizzle", icon: "🌦️" };
    }

    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
        return { text: "Rainy", icon: "🌧️" };
    }

    if ([71, 73, 75, 77, 85, 86].includes(code)) {
        return { text: "Snowy", icon: "❄️" };
    }

    if ([95, 96, 99].includes(code)) {
        return { text: "Thunderstorm", icon: "⛈️" };
    }

    return { text: "Variable conditions", icon: "🌤️" };
}


// Update the current weather section
function displayWeather(place, data) {
    const current = data.current;
    const info = getWeatherInfo(
        current.weather_code,
        current.is_day
    );

    const location = [
        place.name,
        place.admin1,
        place.country
    ].filter(Boolean);

    document.getElementById("location").textContent =
        [...new Set(location)].join(", ");

    const date = new Date(current.time);

    document.getElementById("date").textContent =
        "Local time · " +
        date.toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: data.timezone
        });

    document.getElementById("temperature").textContent =
        `${Math.round(current.temperature_2m)}°`;

    document.getElementById("description").textContent =
        info.text;

    document.getElementById("hero-icon").textContent =
        info.icon;

    document.getElementById("feels-like").textContent =
        `${Math.round(current.apparent_temperature)}°C`;

    document.getElementById("humidity").innerHTML =
        `${current.relative_humidity_2m}<small>%</small>`;

    document.getElementById("wind").innerHTML =
        `${current.wind_speed_10m}<small> km/h</small>`;

    document.getElementById("precipitation").innerHTML =
        `${current.precipitation}<small> mm</small>`;

    document.getElementById("condition-short").textContent =
        info.text;

    document.getElementById("condition-note").textContent =
        current.is_day ? "Daytime conditions" : "Nighttime conditions";

    // Update decorative meters
    document.getElementById("humidity-meter").style.width =
        `${Math.max(0, Math.min(100, current.relative_humidity_2m))}%`;

    document.getElementById("wind-meter").style.width =
        `${Math.max(0, Math.min(100, current.wind_speed_10m / 1.5))}%`;

    document.getElementById("rain-meter").style.width =
        `${Math.max(0, Math.min(100, current.precipitation * 10))}%`;

    displayForecast(data.daily);
}


// Build forecast cards
function displayForecast(daily) {
    const grid = document.getElementById("forecast-grid");
    grid.replaceChildren();

    daily.time.forEach(function (date, index) {
        const info = getWeatherInfo(daily.weather_code[index]);

        const card = document.createElement("article");
        card.className = "forecast-card";

        const day = document.createElement("p");
        day.className = "forecast-day";

        day.textContent = new Date(date + "T12:00:00Z")
            .toLocaleDateString("en-US", {
                weekday: "short",
                timeZone: "UTC"
            });

        const forecastDate = document.createElement("p");
        forecastDate.className = "forecast-date";
        forecastDate.textContent = new Date(date + "T12:00:00Z")
            .toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                timeZone: "UTC"
            });

        const icon = document.createElement("span");
        icon.className = "forecast-icon";
        icon.textContent = info.icon;

        const description = document.createElement("p");
        description.className = "forecast-desc";
        description.textContent = info.text;

        const high = document.createElement("p");
        high.className = "forecast-high";
        high.textContent =
            `${Math.round(daily.temperature_2m_max[index])}°`;

        const low = document.createElement("p");
        low.className = "forecast-low";
        low.textContent =
            `Low ${Math.round(daily.temperature_2m_min[index])}°`;

        card.append(
            day,
            forecastDate,
            icon,
            description,
            high,
            low
        );

        grid.appendChild(card);
    });
}
