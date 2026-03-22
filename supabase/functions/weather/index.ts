const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type WeatherPayload = {
  latitude?: number;
  longitude?: number;
};

type WeatherResponse = {
  temperature: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
};

const DEFAULT_COORDS = {
  latitude: 37.98,
  longitude: 23.73,
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function parseCoordinates(payload: WeatherPayload) {
  const latitude =
    typeof payload.latitude === "number" && Number.isFinite(payload.latitude)
      ? payload.latitude
      : DEFAULT_COORDS.latitude;
  const longitude =
    typeof payload.longitude === "number" && Number.isFinite(payload.longitude)
      ? payload.longitude
      : DEFAULT_COORDS.longitude;

  return { latitude, longitude };
}

function mapWeatherCode(weatherCode: number): Pick<WeatherResponse, "description" | "icon"> {
  switch (weatherCode) {
    case 0:
      return { description: "Αίθριος καιρός", icon: "sun" };
    case 1:
    case 2:
      return { description: "Λίγες νεφώσεις", icon: "cloud-sun" };
    case 3:
      return { description: "Συννεφιά", icon: "cloud" };
    case 45:
    case 48:
      return { description: "Ομίχλη", icon: "cloud-fog" };
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return { description: "Ψιχάλα", icon: "cloud-drizzle" };
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
    case 80:
    case 81:
    case 82:
      return { description: "Βροχή", icon: "cloud-rain" };
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return { description: "Χιονόπτωση", icon: "snowflake" };
    case 95:
    case 96:
    case 99:
      return { description: "Καταιγίδα", icon: "cloud-lightning" };
    default:
      return { description: "Μεταβλητός καιρός", icon: "cloud" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const payload = (await req.json().catch(() => ({}))) as WeatherPayload;
    const { latitude, longitude } = parseCoordinates(payload);

    const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
    weatherUrl.searchParams.set("latitude", String(latitude));
    weatherUrl.searchParams.set("longitude", String(longitude));
    weatherUrl.searchParams.set(
      "current",
      "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
    );
    weatherUrl.searchParams.set("timezone", "auto");
    weatherUrl.searchParams.set("wind_speed_unit", "kmh");

    const weatherResponse = await fetch(weatherUrl);
    const weatherJson = await weatherResponse.json().catch(() => null);

    if (!weatherResponse.ok || !weatherJson?.current) {
      console.error("Weather API error:", weatherJson);
      return jsonResponse(502, { error: "Failed to fetch weather data" });
    }

    const current = weatherJson.current as Record<string, number>;
    const weatherCode = Number(current.weather_code ?? -1);
    const { description, icon } = mapWeatherCode(weatherCode);

    const result: WeatherResponse = {
      temperature: Math.round(Number(current.temperature_2m ?? 0)),
      humidity: Math.round(Number(current.relative_humidity_2m ?? 0)),
      windSpeed: Math.round(Number(current.wind_speed_10m ?? 0)),
      description,
      icon,
    };

    return jsonResponse(200, result);
  } catch (error) {
    console.error("Weather function error:", error);
    return jsonResponse(500, { error: "Internal server error" });
  }
});
