"use server";

import { Country, City, State } from 'country-state-city';

// Return minimal data to reduce payload
// Return minimal data to reduce payload
const SUPPORTED_COUNTRY_CODES = [
    "JP", "KR", "TW", "CN", "HK", "SG", "MY", "PH", "TH", "ID",
    "TR", "US", "CA", "MX", "FR", "BR", "DE", "AU", "NZ", "GB"
];

export async function getCountriesAction() {
    return Country.getAllCountries()
        .filter(c => SUPPORTED_COUNTRY_CODES.includes(c.isoCode))
        .map(c => ({
            code: c.isoCode,
            name: c.name
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getStatesAction(countryCode: string) {
    if (!countryCode) return [];
    return State.getStatesOfCountry(countryCode).map(s => ({
        name: s.name,
        code: s.isoCode
    }));
}

const CITY_BLOCKLIST = [
    "Cebuano",
    "Tagalog",
    "Visayan",
    "Ilocano",
    "Bicolano",
    "Waray",
];

// Helper to normalize city names for comparison
function getBaseName(name: string): string {
    return name
        .replace(/^City of /i, "")
        .replace(/ City$/i, "")
        .trim();
}

export async function getCitiesAction(countryCode: string, stateCode?: string) {
    if (!countryCode) return [];

    let rawCities = [];

    // PH Exception: Keep custom global filter logic
    if (countryCode === 'PH') {
        rawCities = City.getCitiesOfCountry(countryCode) || [];
    } else if (stateCode) {
        rawCities = City.getCitiesOfState(countryCode, stateCode) || [];
    } else {
        // Fallback or No State available -> Get All Country Cities
        rawCities = City.getCitiesOfCountry(countryCode) || [];
    }

    // 1. Filter Blocklist
    let validCities = rawCities.filter(c => !CITY_BLOCKLIST.includes(c.name));

    // PH Specific Filter: Remove Municipalities (keep only Cities and Manila)
    if (countryCode === 'PH') {
        validCities = validCities.filter(c =>
            c.name === "Manila" ||
            c.name.includes("City") ||
            c.name.includes("city")
        );
    }

    // 2. Normalize & De-dupe
    const cityMap = new Map<string, string>();

    for (const city of validCities) {
        const name = city.name;

        // For PH, use advanced normalization
        // For others, use exact name key to avoid over-deduplication, 
        // OR use same normalization if we trust it. 
        // For safety/consistency with previous robust PH logic, let's keep it global but check results.
        const base = getBaseName(name);

        if (!cityMap.has(base)) {
            cityMap.set(base, name);
            continue;
        }

        // Only apply "City of" dedupe logic for PH to be absolutely safe?
        // Actually, "City of London" vs "London" validly exists? 
        // In this library "City of London" is a borough, "London" is the city.
        // Let's restrict strict dedupe to PH for now as the user heavily requested it there.
        // For others, we might just want simple name dedupe.

        if (countryCode !== 'PH') {
            // For non-PH, if we already have a city with this Base name...
            // e.g. "New York" exists, "New York City" comes in -> Base is "New York".
            // We probably want "New York". 
            // Let's stick to the robust logic, it generally prefers "X City" or "X" over "City of X".
        }

        const existing = cityMap.get(base)!;
        const isExistingCityOf = existing.startsWith("City of ");
        const isCurrentCityOf = name.startsWith("City of ");
        const isExistingSuffixed = existing.endsWith(" City");
        const isCurrentSuffixed = name.endsWith(" City");

        if (isExistingCityOf) {
            cityMap.set(base, name);
        } else if (isCurrentSuffixed && !isExistingSuffixed) {
            cityMap.set(base, name);
        }
    }

    return Array.from(cityMap.values())
        .map(name => ({ name }))
        .sort((a, b) => a.name.localeCompare(b.name));
}
