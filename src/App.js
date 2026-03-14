import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────
//  🔧 PASTE YOUR SUPABASE CREDENTIALS HERE
//  supabase.com → your project → Settings → API
// ─────────────────────────────────────────────────────────────
const SUPABASE_URL  = "https://fvvtdovifwqzgoxaatiy.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2dnRkb3ZpZndxemdveGFhdGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTg0MDgsImV4cCI6MjA4ODczNDQwOH0.N3kY38cciGQTF2atyPUcwWCsVlA2dEUh0O1oWo_XUgc";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Wash types ────────────────────────────────────────────────
const WASH_TYPES = [
  { id: "indoor",    label: "Indoor Clothes",  emoji: "👕", color: "#f97316" },
  { id: "outdoor",   label: "Outdoor Clothes", emoji: "🧥", color: "#a78bfa" },
  { id: "underwear", label: "Underwear",        emoji: "🩲", color: "#f9a8d4" },
  { id: "bedsheets", label: "Bedsheets",        emoji: "🛏️", color: "#34d399" },
  { id: "towels",    label: "Towels",           emoji: "🏖️", color: "#60a5fa" },
];

const MONTHS     = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

// ── Helpers ───────────────────────────────────────────────────
const toDateKey = (d) => {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
};
const daysAgo = (d) => {
  const diff = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff}d ago`;
};
const fmtHour = (h) => {
  const s = h >= 12 ? "pm" : "am";
  const d = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${d}${s}`;
};

// ── Nighttime ─────────────────────────────────────────────────
const isNightHour  = (h) => h >= 20 || h < 7;
const nightPenalty = (h) => {
  if (!isNightHour(h)) return 0;
  return (h >= 22 || h < 5) ? 50 : 30;
};

// ── Drying score ──────────────────────────────────────────────
function calcDryScore({ precipProb, humidity, temp, windSpeed, cloudCover, hour = null }) {
  let score = 100;
  score -= precipProb * 0.7;
  if (humidity > 50)    score -= (humidity - 50) * 0.5;
  if (temp < 10)        score -= (10 - temp) * 2;
  else if (temp > 25)   score += 5;
  if (windSpeed < 5)    score -= 10;
  else if (windSpeed <= 30) score += Math.min(windSpeed * 0.3, 8);
  if (cloudCover > 70)  score -= (cloudCover - 70) * 0.15;
  if (hour !== null)    score -= nightPenalty(hour);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getVerdict(score) {
  if (score >= 80) return { label: "Great day to hang outside!",    color: "#34d399", emoji: "☀️",  bg: "#022c22" };
  if (score >= 60) return { label: "Pretty good conditions",         color: "#86efac", emoji: "⛅",  bg: "#052e16" };
  if (score >= 40) return { label: "Marginal — keep an eye out",     color: "#fbbf24", emoji: "🌥️", bg: "#2d1f00" };
  if (score >= 20) return { label: "Risky — consider drying inside", color: "#fb923c", emoji: "🌦️", bg: "#2d1000" };
  return           { label: "Don't hang outside today",               color: "#f87171", emoji: "🌧️", bg: "#2d0a0a" };
}

function scoreColor(s) {
  if (s >= 75) return "#34d399";
  if (s >= 50) return "#86efac";
  if (s >= 35) return "#fbbf24";
  if (s >= 20) return "#fb923c";
  return "#f87171";
}

const LEGEND = [
  { label: "Excellent", range: "80–100%", color: "#34d399" },
  { label: "Good",      range: "60–79%",  color: "#86efac" },
  { label: "Marginal",  range: "40–59%",  color: "#fbbf24" },
  { label: "Risky",     range: "20–39%",  color: "#fb923c" },
  { label: "Bad",       range: "0–19%",   color: "#f87171" },
];

// ══════════════════════════════════════════════════════════════
//  AUTH SCREEN
// ══════════════════════════════════════════════════════════════
function AuthScreen({ onAuth }) {
  const [mode, setMode]         = useState("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);

  const submit = async () => {
    if (!email || !password) return;
    setLoading(true); setError(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setDone(true);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuth(data.user);
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 28px" }}>
      <div style={{ marginBottom: 44 }}>
        <p style={{ color: "#6b7280", fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Welcome to</p>
        <h1 style={{ color: "#f9fafb", fontSize: 40, fontWeight: 700, lineHeight: 1.1 }}>Wash<br />Log</h1>
        <p style={{ color: "#4b5563", fontSize: 14, marginTop: 10 }}>Track your laundry, simply.</p>
      </div>

      {done ? (
        <div style={{ background: "#022c22", border: "1px solid #34d39950", borderRadius: 18, padding: 28, textAlign: "center" }}>
          <div style={{ fontSize: 38, marginBottom: 12 }}>📬</div>
          <p style={{ color: "#34d399", fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Check your email!</p>
          <p style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.6 }}>Confirmation link sent to <strong style={{ color: "#f9fafb" }}>{email}</strong>. Click it, then log in.</p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", background: "#1a1a1f", borderRadius: 14, padding: 4, marginBottom: 24 }}>
            {["login","signup"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(null); }} style={{
                flex: 1, padding: "10px", borderRadius: 10, border: "none",
                background: mode === m ? "#f97316" : "transparent",
                color: mode === m ? "#fff" : "#6b7280",
                fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
              }}>{m === "login" ? "Log In" : "Sign Up"}</button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
            <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)}
              style={{ background: "#1a1a1f", border: "1.5px solid #2a2a30", color: "#f9fafb", padding: "14px 16px", borderRadius: 14, fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()}
              style={{ background: "#1a1a1f", border: "1.5px solid #2a2a30", color: "#f9fafb", padding: "14px 16px", borderRadius: 14, fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
          </div>
          {error && <div style={{ background: "#2d0a0a", border: "1px solid #f8717150", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}><p style={{ color: "#f87171", fontSize: 13 }}>{error}</p></div>}
          <button onClick={submit} disabled={loading || !email || !password} style={{
            width: "100%", padding: "16px", borderRadius: 18,
            background: email && password ? "linear-gradient(135deg, #f97316, #fb923c)" : "#2a2a30",
            border: "none", color: email && password ? "#fff" : "#6b7280",
            fontSize: 16, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
            cursor: email && password ? "pointer" : "not-allowed",
            boxShadow: email && password ? "0 8px 30px rgba(249,115,22,0.3)" : "none", transition: "all 0.2s",
          }}>{loading ? "..." : mode === "login" ? "Log In" : "Create Account"}</button>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  WEATHER / DRYING SCREEN
// ══════════════════════════════════════════════════════════════
function WeatherScreen() {
  const [inputVal, setInputVal]       = useState("Southampton");
  const [cityDisplay, setCityDisplay] = useState("");
  const [weather, setWeather]         = useState(null);
  const [forecast, setForecast]       = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [showLegend, setShowLegend]   = useState(false);
  const [currentCity, setCurrentCity] = useState("");

  // Saved locations — stored in localStorage, max 5
  const [savedLocations, setSavedLocations] = useState(() => {
    try { return JSON.parse(localStorage.getItem("washlog_locations") || "[]"); } catch { return []; }
  });
  const persistLocations = (locs) => { setSavedLocations(locs); localStorage.setItem("washlog_locations", JSON.stringify(locs)); };
  const saveLocation   = () => { if (!currentCity || savedLocations.includes(currentCity)) return; persistLocations([currentCity, ...savedLocations].slice(0, 5)); };
  const removeLocation = (city) => persistLocations(savedLocations.filter(c => c !== city));
  const isSaved        = savedLocations.includes(currentCity);

  const fetchWeather = async (cityName) => {
    setLoading(true); setError(null); setWeather(null); setForecast(null);
    try {
      const geoRes  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`);
      const geoData = await geoRes.json();
      if (!geoData.results?.length) { setError("City not found. Try another name."); setLoading(false); return; }

      const { latitude, longitude, name, country } = geoData.results[0];
      setCityDisplay(`${name}, ${country}`);
      setCurrentCity(name);

      const wxRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
        `&current=temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m,cloud_cover` +
        `&hourly=temperature_2m,precipitation_probability,wind_speed_10m,cloud_cover,relative_humidity_2m` +
        `&daily=precipitation_probability_max,temperature_2m_max,wind_speed_10m_max,cloud_cover_mean` +
        `&forecast_days=5&timezone=auto`
      );
      const wx      = await wxRes.json();
      const c       = wx.current;
      const nowHour = new Date().getHours();

      const currentScore = calcDryScore({
        precipProb: c.precipitation_probability ?? 0,
        humidity:   c.relative_humidity_2m ?? 60,
        temp:       c.temperature_2m ?? 15,
        windSpeed:  c.wind_speed_10m ?? 10,
        cloudCover: c.cloud_cover ?? 50,
        hour:       nowHour,
      });

      // Hourly — next 12 hours with nighttime awareness
      const hourlySlots = [];
      for (let i = nowHour; i < nowHour + 12; i++) {
        const h   = i % 24;
        const idx = wx.hourly.time.findIndex(t => t.endsWith(`T${String(h).padStart(2,"0")}:00`));
        if (idx !== -1) {
          hourlySlots.push({
            hour:    h,
            isNight: isNightHour(h),
            score:   calcDryScore({
              precipProb: wx.hourly.precipitation_probability[idx] ?? 0,
              humidity:   wx.hourly.relative_humidity_2m[idx] ?? 60,
              temp:       wx.hourly.temperature_2m[idx] ?? 15,
              windSpeed:  wx.hourly.wind_speed_10m[idx] ?? 10,
              cloudCover: wx.hourly.cloud_cover[idx] ?? 50,
              hour:       h,
            }),
            rain: wx.hourly.precipitation_probability[idx] ?? 0,
          });
        }
      }

      // Good hours left = score >= 60 AND daytime
      const goodHoursLeft = hourlySlots.filter(h => h.score >= 60 && !h.isNight).length;

      // 5-day at midday — no night penalty
      const daily = wx.daily.time.slice(0, 5).map((dateStr, d) => {
        const dateObj = new Date(dateStr + "T12:00:00");
        return {
          label: d === 0 ? "Today" : d === 1 ? "Tmrw" : dateObj.toLocaleDateString("en-GB", { weekday: "short" }),
          score: calcDryScore({
            precipProb: wx.daily.precipitation_probability_max[d] ?? 0,
            humidity:   60,
            temp:       wx.daily.temperature_2m_max[d] ?? 15,
            windSpeed:  wx.daily.wind_speed_10m_max[d] ?? 10,
            cloudCover: wx.daily.cloud_cover_mean[d] ?? 50,
            hour:       12,
          }),
          rain: wx.daily.precipitation_probability_max[d] ?? 0,
          temp: Math.round(wx.daily.temperature_2m_max[d] ?? 15),
        };
      });

      setWeather({
        score: currentScore,
        temp:  Math.round(c.temperature_2m),
        humidity: c.relative_humidity_2m,
        wind: Math.round(c.wind_speed_10m),
        rain: c.precipitation_probability ?? 0,
        isNight: isNightHour(nowHour),
        goodHoursLeft,
      });
      setForecast({ hourly: hourlySlots, daily });
    } catch {
      setError("Couldn't fetch weather. Check your internet connection.");
    }
    setLoading(false);
  };

  useEffect(() => { fetchWeather("Southampton"); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const verdict = weather ? getVerdict(weather.score) : null;

  return (
    <div style={{ padding: "60px 24px 100px" }}>

      {/* Header + legend toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <p style={{ color: "#6b7280", fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Drying Conditions</p>
          <h2 style={{ color: "#f9fafb", fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>Can I hang<br />outside?</h2>
        </div>
        <button onClick={() => setShowLegend(l => !l)} style={{
          background: showLegend ? "#f9731618" : "#1a1a1f",
          border: `1.5px solid ${showLegend ? "#f97316" : "#2a2a30"}`,
          color: showLegend ? "#f97316" : "#6b7280",
          padding: "7px 13px", borderRadius: 10, fontSize: 12,
          fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
          cursor: "pointer", marginTop: 4, transition: "all 0.2s",
        }}>{showLegend ? "✕ Close" : "? Legend"}</button>
      </div>

      {/* Legend panel */}
      {showLegend && (
        <div style={{ background: "#1a1a1f", border: "1px solid #2a2a30", borderRadius: 16, padding: "16px 18px", marginBottom: 20 }}>
          <p style={{ color: "#6b7280", fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Score guide</p>
          {LEGEND.map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: l.color, flexShrink: 0 }} />
              <span style={{ color: l.color, fontWeight: 700, fontSize: 13, width: 70, fontFamily: "'Space Mono', monospace" }}>{l.range}</span>
              <span style={{ color: "#9ca3af", fontSize: 13 }}>{l.label}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid #2a2a30", marginTop: 12, paddingTop: 12 }}>
            <p style={{ color: "#4b5563", fontSize: 11, lineHeight: 1.7 }}>
              Factors: rain chance (biggest weight), humidity, temperature, wind, cloud cover.
            </p>
            <p style={{ color: "#4b5563", fontSize: 11, lineHeight: 1.7, marginTop: 4 }}>
              🌙 <strong style={{ color: "#6b7280" }}>Nighttime (8pm–7am)</strong> gets a heavy penalty — dew settles on clothes and there's no sun to dry them.
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={inputVal} onChange={e => setInputVal(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchWeather(inputVal)}
          placeholder="Enter a city..."
          style={{ flex: 1, background: "#1a1a1f", border: "1.5px solid #2a2a30", color: "#f9fafb", padding: "11px 16px", borderRadius: 14, fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
        <button onClick={() => fetchWeather(inputVal)} style={{
          background: "linear-gradient(135deg, #f97316, #fb923c)", border: "none", color: "#fff",
          padding: "11px 18px", borderRadius: 14, fontSize: 13, fontWeight: 700,
          fontFamily: "'DM Sans', sans-serif", cursor: "pointer", boxShadow: "0 4px 16px rgba(249,115,22,0.3)",
        }}>Search</button>
        {currentCity && (
          <button onClick={saveLocation} title={isSaved ? "Already saved" : "Save this city"} style={{
            background: isSaved ? "#f9731620" : "#1a1a1f",
            border: `1.5px solid ${isSaved ? "#f97316" : "#2a2a30"}`,
            color: isSaved ? "#f97316" : "#6b7280",
            width: 44, borderRadius: 14, fontSize: 18, cursor: isSaved ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            transition: "all 0.2s",
          }}>{isSaved ? "★" : "☆"}</button>
        )}
      </div>

      {/* Saved locations */}
      {savedLocations.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {savedLocations.map(city => (
            <div key={city} style={{ display: "flex", alignItems: "center", gap: 4, background: currentCity === city ? "#f9731620" : "#1a1a1f", border: `1.5px solid ${currentCity === city ? "#f97316" : "#2a2a30"}`, borderRadius: 20, paddingLeft: 12, paddingRight: 6, paddingTop: 5, paddingBottom: 5 }}>
              <button onClick={() => { setInputVal(city); fetchWeather(city); }} style={{ background: "none", border: "none", color: currentCity === city ? "#f97316" : "#9ca3af", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: 0 }}>{city}</button>
              <button onClick={() => removeLocation(city)} style={{ background: "none", border: "none", color: "#4b5563", fontSize: 14, cursor: "pointer", padding: "0 2px", lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "50px 0" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌀</div>
          <p style={{ color: "#6b7280", fontSize: 13, fontFamily: "'Space Mono', monospace" }}>Fetching weather...</p>
        </div>
      )}
      {error && (
        <div style={{ background: "#2d0a0a", border: "1px solid #f8717150", borderRadius: 16, padding: 18, textAlign: "center" }}>
          <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>
        </div>
      )}

      {weather && verdict && (
        <>
          <p style={{ color: "#6b7280", fontSize: 12, fontFamily: "'Space Mono', monospace", marginBottom: 14, textAlign: "center" }}>📍 {cityDisplay}</p>

          {/* Nighttime banner */}
          {weather.isNight && (
            <div style={{ background: "#0f0f1e", border: "1px solid #3730a350", borderRadius: 14, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>🌙</span>
              <p style={{ color: "#a5b4fc", fontSize: 13, lineHeight: 1.5 }}>It's nighttime — score is reduced. Dew settles on clothes and there's no sun to dry them.</p>
            </div>
          )}

          {/* Verdict card */}
          <div style={{ background: verdict.bg, border: `1.5px solid ${verdict.color}40`, borderRadius: 22, padding: "28px 20px", textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 44, marginBottom: 12, lineHeight: 1 }}>{verdict.emoji}</div>
            <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 16px" }}>
              <svg width="120" height="120" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="60" cy="60" r="52" fill="none" stroke="#1a1a1f" strokeWidth="10" />
                <circle cx="60" cy="60" r="52" fill="none" stroke={verdict.color} strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 52}`}
                  strokeDashoffset={`${2 * Math.PI * 52 * (1 - weather.score / 100)}`}
                  style={{ transition: "stroke-dashoffset 1s ease" }}
                />
              </svg>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
                <p style={{ color: verdict.color, fontSize: 28, fontWeight: 700, fontFamily: "'Space Mono', monospace", lineHeight: 1 }}>{weather.score}%</p>
                <p style={{ color: "#6b7280", fontSize: 10 }}>drying score</p>
              </div>
            </div>
            <p style={{ color: verdict.color, fontSize: 17, fontWeight: 700, marginBottom: 14 }}>{verdict.label}</p>

            {/* Hours of good conditions */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#0f0f1180", borderRadius: 20, padding: "7px 16px" }}>
              <span style={{ fontSize: 15 }}>⏱️</span>
              {weather.goodHoursLeft > 0 ? (
                <span style={{ color: "#86efac", fontSize: 13, fontWeight: 600 }}>
                  {weather.goodHoursLeft}h of good drying left today
                </span>
              ) : (
                <span style={{ color: "#6b7280", fontSize: 13 }}>
                  No good drying windows left today
                </span>
              )}
            </div>
          </div>

          {/* Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              { icon: "🌡️", label: "Temp",       value: `${weather.temp}°C`,    warn: weather.temp < 8 },
              { icon: "💧", label: "Humidity",    value: `${weather.humidity}%`, warn: weather.humidity > 70 },
              { icon: "🌧️", label: "Rain chance", value: `${weather.rain}%`,     warn: weather.rain > 40 },
              { icon: "💨", label: "Wind speed",  value: `${weather.wind} km/h`, warn: false },
            ].map(m => (
              <div key={m.label} style={{ background: "#1a1a1f", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{m.icon}</span>
                <div>
                  <p style={{ color: m.warn ? "#fb923c" : "#f9fafb", fontSize: 16, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{m.value}</p>
                  <p style={{ color: "#6b7280", fontSize: 11, marginTop: 1 }}>{m.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Hourly strip */}
          {forecast?.hourly?.length > 0 && (
            <>
              <p style={{ color: "#6b7280", fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Next few hours</p>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 16 }}>
                {forecast.hourly.map((h, i) => (
                  <div key={i} style={{
                    background: h.isNight ? "#111118" : "#1a1a1f",
                    borderRadius: 14, padding: "12px 10px", textAlign: "center",
                    minWidth: 58, flexShrink: 0,
                    border: `1.5px solid ${h.isNight ? "#2a2a4050" : scoreColor(h.score) + "35"}`,
                    opacity: h.isNight ? 0.6 : 1,
                  }}>
                    <p style={{ color: h.isNight ? "#3b3b5c" : "#6b7280", fontSize: 10, fontFamily: "'Space Mono', monospace", marginBottom: 3 }}>{fmtHour(h.hour)}</p>
                    {h.isNight && <p style={{ fontSize: 9, marginBottom: 2 }}>🌙</p>}
                    <p style={{ color: h.isNight ? "#4b4b6b" : scoreColor(h.score), fontSize: 14, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{h.score}%</p>
                    <p style={{ color: "#4b5563", fontSize: 9, marginTop: 3 }}>{h.rain}%🌧</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 5-day */}
          {forecast?.daily && (
            <>
              <p style={{ color: "#6b7280", fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>5-day forecast</p>
              <div style={{ background: "#1a1a1f", borderRadius: 16, overflow: "hidden" }}>
                {forecast.daily.map((d, i) => {
                  const v = getVerdict(d.score);
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", padding: "13px 16px", borderBottom: i < 4 ? "1px solid #2a2a30" : "none" }}>
                      <span style={{ color: "#9ca3af", fontSize: 12, width: 42, fontFamily: "'Space Mono', monospace" }}>{d.label}</span>
                      <span style={{ fontSize: 18, marginRight: 10 }}>{v.emoji}</span>
                      <div style={{ flex: 1, background: "#2a2a30", borderRadius: 20, height: 6, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${d.score}%`, background: `linear-gradient(90deg, ${scoreColor(d.score)}, ${scoreColor(d.score)}99)`, borderRadius: 20, transition: "width 0.6s ease" }} />
                      </div>
                      <span style={{ color: scoreColor(d.score), fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono', monospace", marginLeft: 10, width: 36, textAlign: "right" }}>{d.score}%</span>
                      <span style={{ color: "#4b5563", fontSize: 11, marginLeft: 8, width: 28, textAlign: "right" }}>{d.temp}°</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════════════════════
export default function LaundryApp() {
  const [user, setUser]               = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [screen, setScreen]           = useState("home");
  const [logs, setLogs]               = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [selectedTypes, setSelectedTypes] = useState([]);
  const [logDate, setLogDate]     = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes]         = useState("");
  const [saving, setSaving]       = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [calMonth, setCalMonth]     = useState(new Date().getMonth());
  const [calYear, setCalYear]       = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (user) fetchLogs(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLogs = async () => {
    setLoadingLogs(true);
    const { data, error } = await supabase.from("wash_logs").select("*").eq("user_id", user.id).order("date", { ascending: false });
    if (!error) setLogs(data || []);
    setLoadingLogs(false);
  };

  const signOut = async () => { await supabase.auth.signOut(); setLogs([]); setScreen("home"); };
  const toggleType = (id) => setSelectedTypes(t => t.includes(id) ? t.filter(x => x !== id) : [...t, id]);

  const submitLog = async () => {
    if (!selectedTypes.length) return;
    setSaving(true);
    const { data, error } = await supabase.from("wash_logs").insert({ user_id: user.id, date: logDate, types: selectedTypes, notes }).select().single();
    if (!error && data) {
      setLogs(l => [data, ...l]);
      setSaveSuccess(true);
      setTimeout(() => { setSaveSuccess(false); setScreen("home"); setSelectedTypes([]); setNotes(""); setLogDate(new Date().toISOString().split("T")[0]); }, 1100);
    }
    setSaving(false);
  };

  const logsByDate = {};
  logs.forEach(l => { const k = toDateKey(l.date); if (!logsByDate[k]) logsByDate[k] = []; logsByDate[k].push(l); });

  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const todayKey    = toDateKey(new Date().toISOString());
  const selectedDayLogs = selectedDay ? (logsByDate[selectedDay] || []) : [];

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); setSelectedDay(null); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); setSelectedDay(null); };

  const intensity      = (c) => !c ? 0 : c === 1 ? 1 : c === 2 ? 2 : 3;
  const bgForLevel     = (n) => ["#1a1a1f","#7c2d1230","#f9731638","#f97316"][n];
  const borderForLevel = (n) => ["#2a2a30","#f9731655","#f97316aa","#fb923c"][n];

  const sortedLogs = [...logs].sort((a,b) => new Date(b.date) - new Date(a.date));
  const lastWash   = sortedLogs.length ? daysAgo(sortedLogs[0].date) : "Never";

  if (!authChecked) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f11" }}>
      <p style={{ color: "#4b5563", fontFamily: "'Space Mono', monospace", fontSize: 13 }}>Loading...</p>
    </div>
  );

  if (!user) return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#0f0f11", minHeight: "100vh", display: "flex", justifyContent: "center" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap'); *{box-sizing:border-box;margin:0;padding:0} input::placeholder{color:#4b5563}`}</style>
      <div style={{ width: "100%", maxWidth: 420 }}><AuthScreen onAuth={setUser} /></div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#0f0f11", minHeight: "100vh", display: "flex", justifyContent: "center" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{display:none}
        .btn{transition:all 0.15s;cursor:pointer}
        .btn:active{transform:scale(0.96)}
        .card{transition:all 0.18s}
        .card:hover{transform:translateY(-1px)}
        .cal-cell{transition:all 0.1s}
        .cal-cell:active{transform:scale(0.88)}
        input::placeholder,textarea::placeholder{color:#4b5563}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(1) opacity(0.4)}
      `}</style>

      <div style={{ width: "100%", maxWidth: 420, minHeight: "100vh", background: "#0f0f11" }}>

        {/* ════ HOME ════ */}
        {screen === "home" && (
          <div style={{ padding: "60px 24px 100px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
              <div>
                <p style={{ color: "#6b7280", fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Your Laundry</p>
                <h1 style={{ color: "#f9fafb", fontSize: 34, fontWeight: 700, lineHeight: 1.1 }}>Wash<br />Log</h1>
              </div>
              <button onClick={signOut} className="btn" style={{ background: "#1a1a1f", border: "none", color: "#6b7280", padding: "8px 14px", borderRadius: 12, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>Sign out</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
              {[{label:"Last Wash",value:lastWash},{label:"Total Loads",value:logs.length}].map(s => (
                <div key={s.label} style={{ background: "#1a1a1f", borderRadius: 16, padding: "18px 16px", textAlign: "center" }}>
                  <p style={{ color: "#f9fafb", fontSize: 22, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{s.value}</p>
                  <p style={{ color: "#6b7280", fontSize: 11, marginTop: 4 }}>{s.label}</p>
                </div>
              ))}
            </div>

            <button className="btn" onClick={() => setScreen("log")} style={{
              width: "100%", padding: "18px", borderRadius: 20,
              background: "linear-gradient(135deg, #f97316, #fb923c)",
              border: "none", color: "#fff", fontSize: 16, fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
              boxShadow: "0 8px 30px rgba(249,115,22,0.35)", marginBottom: 28,
            }}>+ Log a Wash</button>

            <p style={{ color: "#6b7280", fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Recent</p>
            {loadingLogs ? (
              <p style={{ color: "#4b5563", fontSize: 13, textAlign: "center", padding: "24px 0" }}>Loading...</p>
            ) : sortedLogs.length === 0 ? (
              <div style={{ background: "#1a1a1f", borderRadius: 16, padding: "28px", textAlign: "center" }}>
                <p style={{ fontSize: 30, marginBottom: 10 }}>🧺</p>
                <p style={{ color: "#4b5563", fontSize: 13 }}>No washes logged yet.<br />Tap the button above to get started!</p>
              </div>
            ) : sortedLogs.slice(0, 4).map(log => {
              const types = (log.types || []).map(id => WASH_TYPES.find(t => t.id === id)).filter(Boolean);
              return (
                <div key={log.id} className="card" style={{ background: "#1a1a1f", borderRadius: 16, padding: "14px 16px", marginBottom: 10, borderLeft: `3px solid ${types[0]?.color || "#f97316"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1, marginRight: 10 }}>
                      {types.map(t => <span key={t.id} style={{ color: t.color, fontSize: 13, fontWeight: 600 }}>{t.emoji} {t.label}</span>)}
                    </div>
                    <span style={{ color: "#6b7280", fontSize: 12, fontFamily: "'Space Mono', monospace", flexShrink: 0 }}>{daysAgo(log.date)}</span>
                  </div>
                  {log.notes ? <p style={{ color: "#6b7280", fontSize: 12, fontStyle: "italic", marginTop: 6 }}>"{log.notes}"</p> : null}
                </div>
              );
            })}
          </div>
        )}

        {/* ════ LOG A WASH ════ */}
        {screen === "log" && (
          <div style={{ padding: "60px 24px 100px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
              <button onClick={() => setScreen("home")} className="btn" style={{ background: "#1a1a1f", border: "none", color: "#f9fafb", width: 36, height: 36, borderRadius: 12, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
              <h2 style={{ color: "#f9fafb", fontSize: 24, fontWeight: 700 }}>Log a Wash</h2>
            </div>

            <p style={{ color: "#6b7280", fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Date</p>
            <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
              style={{ background: "#1a1a1f", border: "none", color: "#f9fafb", padding: "12px 16px", borderRadius: 14, fontSize: 14, fontFamily: "'DM Sans', sans-serif", width: "100%", outline: "none", marginBottom: 28 }} />

            <p style={{ color: "#6b7280", fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>What did you wash?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {WASH_TYPES.map(t => {
                const sel = selectedTypes.includes(t.id);
                return (
                  <button key={t.id} className="btn" onClick={() => toggleType(t.id)} style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderRadius: 16,
                    border: `2px solid ${sel ? t.color : "#2a2a30"}`,
                    background: sel ? t.color + "18" : "#1a1a1f",
                    cursor: "pointer", textAlign: "left", width: "100%",
                  }}>
                    <span style={{ fontSize: 24 }}>{t.emoji}</span>
                    <span style={{ color: sel ? t.color : "#9ca3af", fontSize: 15, fontWeight: sel ? 700 : 400, fontFamily: "'DM Sans', sans-serif" }}>{t.label}</span>
                    {sel && <span style={{ marginLeft: "auto", color: t.color, fontSize: 18 }}>✓</span>}
                  </button>
                );
              })}
            </div>

            <p style={{ color: "#6b7280", fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Notes (optional)</p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any stains? Anything to remember?" rows={3}
              style={{ background: "#1a1a1f", border: "none", color: "#f9fafb", padding: "12px 16px", borderRadius: 14, fontSize: 14, fontFamily: "'DM Sans', sans-serif", width: "100%", outline: "none", resize: "none", marginBottom: 24 }} />

            <button className="btn" onClick={submitLog} disabled={!selectedTypes.length || saving} style={{
              width: "100%", padding: "18px", borderRadius: 20,
              background: selectedTypes.length ? "linear-gradient(135deg, #f97316, #fb923c)" : "#2a2a30",
              border: "none", color: selectedTypes.length ? "#fff" : "#6b7280",
              fontSize: 16, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
              cursor: selectedTypes.length ? "pointer" : "not-allowed",
              boxShadow: selectedTypes.length ? "0 8px 30px rgba(249,115,22,0.35)" : "none", transition: "all 0.2s",
            }}>
              {saveSuccess ? "✓ Saved!" : saving ? "Saving..." : selectedTypes.length ? "Save Wash" : "Select at least one type"}
            </button>
          </div>
        )}

        {/* ════ CALENDAR ════ */}
        {screen === "calendar" && (
          <div style={{ padding: "60px 24px 100px" }}>
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: "#6b7280", fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Wash Calendar</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2 style={{ color: "#f9fafb", fontSize: 26, fontWeight: 700 }}>{MONTHS[calMonth]} {calYear}</h2>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={prevMonth} style={{ background: "#1a1a1f", border: "none", color: "#f9fafb", width: 36, height: 36, borderRadius: 10, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
                  <button className="btn" onClick={nextMonth} style={{ background: "#1a1a1f", border: "none", color: "#f9fafb", width: 36, height: 36, borderRadius: 10, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
              {[{label:"None",n:0},{label:"1",n:1},{label:"2",n:2},{label:"3+",n:3}].map(({label,n}) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 11, height: 11, borderRadius: 3, background: bgForLevel(n), border: `1.5px solid ${borderForLevel(n)}` }} />
                  <span style={{ color: "#6b7280", fontSize: 10, fontFamily: "'Space Mono', monospace" }}>{label}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
              {DAY_LABELS.map(d => <div key={d} style={{ textAlign: "center", color: "#4b5563", fontSize: 11, fontFamily: "'Space Mono', monospace", paddingBottom: 4 }}>{d}</div>)}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
              {Array.from({ length: firstDay }).map((_,i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_,i) => {
                const day = i + 1;
                const key = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                const count = (logsByDate[key] || []).length;
                const level = intensity(count);
                const isToday = key === todayKey, isSelected = key === selectedDay;
                return (
                  <div key={key} className="cal-cell" onClick={() => count > 0 ? setSelectedDay(key === selectedDay ? null : key) : null}
                    style={{ aspectRatio: "1", borderRadius: 10, background: bgForLevel(level), border: isSelected ? "2px solid #fb923c" : isToday ? "2px solid #f9731688" : `1.5px solid ${borderForLevel(level)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: count > 0 ? "pointer" : "default", gap: 1 }}>
                    <span style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: level === 3 ? "#fff" : isToday ? "#fb923c" : "#9ca3af", fontFamily: "'Space Mono', monospace", lineHeight: 1 }}>{day}</span>
                    {count > 0 && <span style={{ fontSize: 9, color: level === 3 ? "#fff" : "#f97316", fontFamily: "'Space Mono', monospace", fontWeight: 700, lineHeight: 1 }}>{count}✕</span>}
                  </div>
                );
              })}
            </div>

            {(() => {
              const mKey  = `${calYear}-${String(calMonth+1).padStart(2,"0")}`;
              const mLogs = logs.filter(l => toDateKey(l.date).startsWith(mKey));
              if (!mLogs.length) return null;
              return (
                <div style={{ marginTop: 20, background: "#1a1a1f", borderRadius: 16, padding: "14px 20px", display: "flex", justifyContent: "space-around" }}>
                  {[{label:"Loads",value:mLogs.length},{label:"Wash Days",value:new Set(mLogs.map(l=>toDateKey(l.date))).size}].map(s => (
                    <div key={s.label} style={{ textAlign: "center" }}>
                      <p style={{ color: "#f97316", fontSize: 22, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{s.value}</p>
                      <p style={{ color: "#6b7280", fontSize: 11, marginTop: 3 }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              );
            })()}

            {selectedDay && (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <p style={{ color: "#f9fafb", fontSize: 14, fontWeight: 600 }}>
                    {new Date(selectedDay + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                  <span style={{ background: "#f9731620", color: "#f97316", fontSize: 11, fontFamily: "'Space Mono', monospace", padding: "4px 10px", borderRadius: 20, fontWeight: 700 }}>
                    {selectedDayLogs.length} load{selectedDayLogs.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {selectedDayLogs.map(log => {
                  const types = (log.types || []).map(id => WASH_TYPES.find(t => t.id === id)).filter(Boolean);
                  return (
                    <div key={log.id} style={{ background: "#1a1a1f", borderRadius: 16, padding: "14px 16px", marginBottom: 10, borderLeft: `3px solid ${types[0]?.color || "#f97316"}` }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: log.notes ? 8 : 0 }}>
                        {types.map(t => <span key={t.id} style={{ background: t.color+"18", color: t.color, fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 20 }}>{t.emoji} {t.label}</span>)}
                      </div>
                      {log.notes ? <p style={{ color: "#6b7280", fontSize: 12, fontStyle: "italic" }}>"{log.notes}"</p> : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════ WEATHER ════ */}
        {screen === "weather" && <WeatherScreen />}

        {/* ════ BOTTOM NAV ════ */}
        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 420, background: "#141418", borderTop: "1px solid #1f1f26", display: "flex", justifyContent: "space-around", padding: "12px 0 24px" }}>
          {[{id:"home",icon:"🏠",label:"Home"},{id:"calendar",icon:"📅",label:"Calendar"},{id:"weather",icon:"🌤️",label:"Drying"}].map(tab => (
            <button key={tab.id} onClick={() => setScreen(tab.id)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: screen === tab.id ? "#f97316" : "#4b5563", transition: "color 0.15s" }}>
              <span style={{ fontSize: 20 }}>{tab.icon}</span>
              <span style={{ fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: screen === tab.id ? 600 : 400 }}>{tab.label}</span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
