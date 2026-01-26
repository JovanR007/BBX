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
            if (!place || !place.location) return;

            const address = place.formattedAddress || "";
            const lat = place.location.lat();
            const lng = place.location.lng();

            // Extract City and Country from address_components
            let city = "";
            let country = "";
            const components = place.addressComponents || [];

            for (const component of components) {
                if (component.types.includes("country")) {
                    country = component.longName;
                }
                if (component.types.includes("locality")) {
                    city = component.longName;
                }
                if (!city && component.types.includes("administrative_area_level_2")) {
                    city = component.longName;
                }
                if (!city && component.types.includes("administrative_area_level_1")) {
                    // Fallback
                }
            }

            if (!city) {
                const town = components.find((c: any) => c.types.includes("postal_town"));
                if (town) city = town.longName;
            }

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
                    {/* @ts-ignore */}
                    <gmpx-place-picker
                        ref={pickerRef}
                        placeholder={placeholder}
                        // Apply rudimentary styling to match internal inputs (web components are isolated but inherit some fonts)
                        style={{ width: '100%' }}
                    />
                </div>
            )}

            {/* Show loading state while waiting for API Key injection */}
            {!apiReady && (
                <div className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                    Initializing...
                </div>
            )}

            {/* Hidden Input for Form Submission compliance if needed */}
            <input type="hidden" name={name} />
        </div>
    );
}
