const phivolcs = require('./services/phivolcsService');
const pagasa = require('./services/pagasaService');
const ndrrmc = require('./services/ndrrmcService');
const news = require('./services/newsService');
const aq = require('./services/airQualityService');

async function test() {
  console.log('--- Testing USGS Earthquakes ---');
  try {
    const eq = await phivolcs.getLatestEarthquakes();
    console.log(`OK: ${eq.length} earthquakes`);
    if (eq[0]) console.log(`  Sample: M${eq[0].magnitude} - ${eq[0].location}`);
  } catch (e) { console.error(`FAIL: ${e.message}`); }

  console.log('\n--- Testing Volcanic Activity ---');
  try {
    const v = await phivolcs.getVolcanicActivity();
    console.log(`OK: ${v.length} volcanoes`);
  } catch (e) { console.error(`FAIL: ${e.message}`); }

  console.log('\n--- Testing Weather/Rainfall ---');
  try {
    const r = await pagasa.getRainfallWarnings();
    console.log(`OK: ${r.length} rainfall warnings`);
    const f = await pagasa.getWeatherForecast();
    console.log(`OK: Weather forecast for ${f.city}`);
  } catch (e) { console.error(`FAIL: ${e.message}`); }

  console.log('\n--- Testing Typhoons (GDACS) ---');
  try {
    const t = await pagasa.getTyphoonWarnings();
    console.log(`OK: ${t.length} typhoon warnings`);
  } catch (e) { console.error(`FAIL: ${e.message}`); }

  console.log('\n--- Testing NDRRMC/ReliefWeb ---');
  try {
    const d = await ndrrmc.getDisasterAlerts();
    console.log(`OK: ${d.length} disaster alerts`);
  } catch (e) { console.error(`FAIL: ${e.message}`); }

  console.log('\n--- Testing News (ReliefWeb fallback) ---');
  try {
    const n = await news.getPhilippinesNews();
    console.log(`OK: ${n.length} news articles`);
    if (n[0]) console.log(`  Sample: ${n[0].title?.substring(0, 80)}`);
  } catch (e) { console.error(`FAIL: ${e.message}`); }

  console.log('\n--- Testing Air Quality (Open-Meteo) ---');
  try {
    const a = await aq.getAirQualityByCoords(14.5995, 120.9842);
    console.log(`OK: AQI=${a.aqi}, source=${a.source}`);
  } catch (e) { console.error(`FAIL: ${e.message}`); }

  console.log('\n--- All tests done ---');
}

test();
