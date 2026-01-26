"use client";

import { useEffect, useRef, useState } from "react";

export interface AddressResult {
    address: string;
    city: string;
    country: string;
    lat: number;
    lng: number;
}

export function AddressAutocomplete({
    name = "location",
    required = false,
    placeholder = "Search address...",
    defaultValue = "",
    onAddressSelect
}: {
    name?: string,
    required?: boolean,
    placeholder?: string,
    defaultValue?: string,
    onAddressSelect?: (result: AddressResult) => void
}) {
    const pickerRef = useRef<any>(null);
    const loaderRef = useRef<any>(null);
    const [libLoaded, setLibLoaded] = useState(false);
    const [apiReady, setApiReady] = useState(false);

    // Initialize Library (Client-Side Only)
    useEffect(() => {
        async function loadLibrary() {
            try {
                // Dynamic import to avoid SSR issues
                await import("@googlemaps/extended-component-library/place_picker.js");
                await import("@googlemaps/extended-component-library/api_loader.js");
                setLibLoaded(true);
            } catch (err) {
                console.error("Failed to load Google Maps library", err);
            }
        }
        loadLibrary();
    }, []);

    // Set API Key and mark ready
    useEffect(() => {
        if (!libLoaded) return;

        const checkAndSetKey = () => {
            // Fallback to hardcoded key if env var fails (Temporary Debugging)
            const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyB1zROdMVjWDyJEp38_onyz6lwwU9ulKsM";

            if (!apiKey) {
                console.error("Critical: API Key is really missing!");
                return false;
            }

            if (loaderRef.current) {
                loaderRef.current.setAttribute("key", apiKey);
                setApiReady(true);
                return true;
            }
            return false;
        };

        // Try immediately
        if (checkAndSetKey()) return;

        // Retry a few times if ref isn't ready (React ref assignment can happen after effect in some edge cases with custom elements)
        const interval = setInterval(() => {
            if (checkAndSetKey()) {
                clearInterval(interval);
            }
        }, 100);

        // Warning timeout
        const timeout = setTimeout(() => {
            clearInterval(interval);
            if (!loaderRef.current) {
                console.error("Timeout: gmpx-api-loader ref never became available.");
            }
        }, 5000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [libLoaded]);

    // Attach Event Listener
    useEffect(() => {
        if (!apiReady) return;

        const picker = pickerRef.current;
        if (!picker) return;

        const handlePlaceChange = () => {
            const place = picker.value;
            console.log("📍 [DEBUG] Selected Place Object:", place);

            if (!place || !place.location) {
                console.warn("⚠️ [DEBUG] Place or Location missing:", place);
                return;
            }

            const address = place.formattedAddress || "";
            // Debugging location access
            const lat = typeof place.location.lat === 'function' ? place.location.lat() : place.location.lat;
            const lng = typeof place.location.lng === 'function' ? place.location.lng() : place.location.lng;

            console.log("📍 [DEBUG] Address:", address);
            console.log("📍 [DEBUG] Lat/Lng:", lat, lng);
            console.log("📍 [DEBUG] Raw Address Components:", place.addressComponents);

            // Extract City and Country from address_components
            let city = "";
            let country = "";
            const components = place.addressComponents || [];

            for (const component of components) {
                // Check snake_case vs camelCase types just in case
                const types = component.types || [];

                // New Places API uses 'longText', Legacy uses 'long_name' or 'longName'
                const value = component.longText || component.longName || component.long_name || "";

                if (types.includes("country")) {
                    country = value;
                }
                if (types.includes("locality")) {
                    city = value;
                }
                if (!city && types.includes("administrative_area_level_2")) {
                    city = value;
                }
                if (!city && types.includes("administrative_area_level_1")) {
                    // Fallback
                }
            }

            console.log("📍 [DEBUG] Extracted:", { city, country });

            if (onAddressSelect) {
                onAddressSelect({
                    address,
                    city,
                    country,
                    lat,
                    lng
                });
            }
        };

        // Standard event listener for web components
        picker.addEventListener("gmpx-placechange", handlePlaceChange);

        return () => {
            picker.removeEventListener("gmpx-placechange", handlePlaceChange);
        };
    }, [onAddressSelect, apiReady]);

    // Handle Initial Value (Persistence)
    useEffect(() => {
        if (!apiReady || !pickerRef.current || !defaultValue) return;

        // Hack: Manually set the input value in the Shadow DOM since 'value' prop expects a Place object
        const setInitialValue = () => {
            const input = pickerRef.current.shadowRoot?.querySelector("input");
            if (input) {
                input.value = defaultValue;
            } else {
                // Retry if shadow DOM isn't ready
                requestAnimationFrame(setInitialValue);
            }
        };
        setTimeout(setInitialValue, 500); // Small delay to allow internal render
    }, [apiReady, defaultValue]);

    // Don't render until client-side library is ready (prevents hydration mismatch)
    if (!libLoaded) {
        return (
            <div className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                Loading Maps...
            </div>
        );
    }

    return (
        <div className="relative w-full">
            {/* API Loader handles the Google Maps script injection */}
            {/* @ts-ignore */}
            <gmpx-api-loader
                ref={loaderRef}
                solution-channel="GMP_GE_placepicker_v2"
            />

            {/* The Place Picker Web Component - Only render when API key is set */}
            {apiReady && (
                <div className="w-full">
                    {/* 
                        Global Styles for the shadow DOM of the picker 
                        We make the picker background transparent so it inherits the container's style.
                    */}
                    <style jsx global>{`
                        gmpx-place-picker {
                            --gmpx-color-surface: transparent; 
                            --gmpx-color-on-surface: inherit;
                            --gmpx-color-primary: hsl(var(--primary));
                            --gmpx-font-family-base: inherit;
                        }
                        gmpx-place-picker input {
                            padding: 0 !important;
                        }
                    `}</style>

                    {/* Wrapper matching Shadcn Input Styles */}
                    <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                        {/* @ts-ignore */}
                        <gmpx-place-picker
                            ref={pickerRef}
                            placeholder={placeholder}
                            style={{
                                width: '100%',
                                background: 'transparent',
                                border: 'none',
                                outline: 'none'
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Show loading state while waiting for API Key injection */}
            {!apiReady && (
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground opacity-50 cursor-not-allowed">
                    Initializing Maps...
                </div>
            )}

            {/* Hidden Input for Form Submission compliance if needed */}
            <input type="hidden" name={name} value={defaultValue} />
        </div>
    );
}
