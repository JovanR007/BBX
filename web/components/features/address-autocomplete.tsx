"use client";

import { useEffect, useRef, useState } from "react";

export interface AddressResult {
    address: string;
    city: string;
    country: string;
    lat: number;
    lng: number;
}

declare global {
    interface Window {
        google: any;
    }
}

export function AddressAutocomplete({
    name = "location",
    required = false,
    placeholder = "Search address...",
    defaultValue = "",
    defaultLat,
    defaultLng,
    onAddressSelect
}: {
    name?: string,
    required?: boolean,
    placeholder?: string,
    defaultValue?: string,
    defaultLat?: number,
    defaultLng?: number,
    onAddressSelect?: (result: AddressResult) => void
}) {
    const pickerRef = useRef<any>(null);
    const loaderRef = useRef<any>(null);
    const [libLoaded, setLibLoaded] = useState(false);
    const [apiReady, setApiReady] = useState(false);
    const [currentValue, setCurrentValue] = useState(defaultValue);
    const [coordinates, setCoordinates] = useState({
        lat: defaultLat || 0,
        lng: defaultLng || 0
    });
    const [resetKey, setResetKey] = useState(0);

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
            // Check if Google Maps is already loaded globally
            if (window.google && window.google.maps) {
                setApiReady(true);
                return true;
            }

            // Fallback to empty string if env var fails
            const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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

        // Retry a few times if ref isn't ready
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

    // Sync defaultValue if it changes externally
    useEffect(() => {
        setCurrentValue(defaultValue);
    }, [defaultValue]);

    // Attach Event Listener
    useEffect(() => {
        if (!apiReady) return;

        const picker = pickerRef.current;
        if (!picker) return;

        const handlePlaceChange = () => {
            const place = picker.value;

            if (!place || !place.location) {
                return;
            }

            const address = place.formattedAddress || "";
            // Update the hidden input value so parent forms can see it
            setCurrentValue(address);

            // Debugging location access
            const lat = typeof place.location.lat === 'function' ? place.location.lat() : place.location.lat;
            const lng = typeof place.location.lng === 'function' ? place.location.lng() : place.location.lng;

            setCoordinates({ lat, lng });

            // Extract City and Country from address_components
            let city = "";
            let country = "";
            const components = place.addressComponents || [];

            for (const component of components) {
                const types = component.types || [];
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

        const handleInput = () => {
            // Sync text value for Clear Button visibility
            const shadowInput = picker.shadowRoot?.querySelector('input');
            if (shadowInput) {
                setCurrentValue(shadowInput.value);
            }
        };

        // Standard event listener for web components
        picker.addEventListener("gmpx-placechange", handlePlaceChange);
        // Listen for typing to show/hide clear button
        picker.addEventListener("input", handleInput);

        return () => {
            picker.removeEventListener("gmpx-placechange", handlePlaceChange);
            picker.removeEventListener("input", handleInput);
        };
    }, [onAddressSelect, apiReady, resetKey]);

    // Handle Initial Value (Persistence) & Style Injection
    useEffect(() => {
        if (!apiReady || !pickerRef.current) return;

        const injectStyles = () => {
            const shadow = pickerRef.current.shadowRoot;
            if (!shadow) {
                requestAnimationFrame(injectStyles);
                return;
            }

            // 1. Persistence & Sync: Always sync input value with prop
            const input = shadow.querySelector("input");
            if (input) {
                // Only update if different to prevent cursor jumping if typing
                if (input.value !== defaultValue) {
                    input.value = defaultValue || "";
                }
            }

            // 2. Style Injection (The "Nuclear" Option for Borders)
            if (!shadow.querySelector("#custom-gmpx-styles")) {
                const style = document.createElement("style");
                style.id = "custom-gmpx-styles";
                style.textContent = `
                    /* Remove Material Design Outlines, Borders, and LABELS */
                    .mdc-notched-outline, 
                    .mdc-line-ripple,
                    .mdc-floating-label,
                    label,
                    div[class*="outline"], 
                    div[class*="border"] {
                        display: none !important;
                        opacity: 0 !important;
                        border: none !important;
                    }
                    
                    /* Force Input Transparent but KEEP padding/layout */
                    input {
                        background: transparent !important;
                        border: none !important;
                        box-shadow: none !important;
                        outline: none !important;
                        /* Ensure text color matches */
                        color: hsl(var(--foreground)) !important;
                        height: 100% !important;
                        padding-left: 2.5rem !important; /* Space for internal Search Icon */
                        padding-right: 2.5rem !important; /* Space for custom Clear Button */
                    }

                    /* Placeholder Styling */
                    input::placeholder {
                        color: hsl(var(--muted-foreground)) !important;
                        opacity: 1 !important;
                    }

                    /* Hide Native Search Cancel Button */
                    input::-webkit-search-cancel-button,
                    input::-webkit-search-decoration {
                        -webkit-appearance: none !important;
                        appearance: none !important;
                        display: none !important;
                    }

                    /* Just in case icon needs help */
                    i, svg {
                        color: hsl(var(--foreground)) !important;
                    }
                 `;
                shadow.appendChild(style);
            }
        };

        // Run immediately and after a short delay to ensure rendering matches
        injectStyles();

        // Retry a few times for robust initialization
        const t1 = setTimeout(injectStyles, 500);
        const t2 = setTimeout(injectStyles, 1000);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };

    }, [apiReady, defaultValue, resetKey]);

    // Don't render until client-side library is ready (prevents hydration mismatch)
    if (!libLoaded) {
        return (
            <div className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-primary inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading Maps...
            </div>
        );
    }

    // Clear button functionality
    const handleClear = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Force re-render of the web component to clear it
        setResetKey(prev => prev + 1);

        setCurrentValue("");
        if (onAddressSelect) {
            onAddressSelect({ address: "", city: "", country: "", lat: 0, lng: 0 });
        }
    };

    return (
        <div className="relative w-full group">
            {/* API Loader handles the Google Maps script injection */}
            {/* Only render loader if window.google is not available (prevent multiple loaders) */}
            {/* @ts-ignore */}
            {!window.google && (
                <gmpx-api-loader
                    ref={loaderRef}
                    solution-channel="GMP_GE_placepicker_v2"
                />
            )}

            {/* The Place Picker Web Component - Only render when API key is set */}
            {apiReady && (
                <div className="w-full relative">
                    {/* Global Styles for the shadow DOM of the picker */}
                    <style jsx global>{`
                        /* Hide the Google Logo/Search Icon if it clashes or looks bad */
                        gmpx-place-picker::part(input) {
                            color: hsl(var(--foreground));
                            background: transparent !important;
                            border: none !important;
                            outline: none !important;
                            box-shadow: none !important;
                            padding: 0 !important;
                            height: 100% !important;
                            width: 100% !important;
                            -webkit-appearance: none !important;
                            appearance: none !important;
                        }
                        
                        /* Hide browser default clear button */
                        gmpx-place-picker::part(input)::-webkit-search-cancel-button,
                        gmpx-place-picker::part(input)::-webkit-search-decoration {
                            -webkit-appearance: none;
                            appearance: none;
                            display: none;
                        }

                        /* Remove default box shadow or border if present on the host */
                         gmpx-place-picker {
                            --gmpx-color-surface: transparent; 
                            --gmpx-color-on-surface: hsl(var(--foreground));
                            
                            /* CRITICAL: Set primary color (Focus Ring) to transparent */
                            --gmpx-color-primary: transparent !important;
                            --gmpx-color-outline: transparent !important;
                            --md-sys-color-outline: transparent !important;
                            --md-sys-color-outline-variant: transparent !important;

                            --gmpx-font-family-base: inherit;
                            font-size: 0.875rem;
                            border: none !important;
                            outline: none !important;
                            display: block;
                            height: 100%;
                            width: 100%;
                        }
                    `}</style>

                    {/* Wrapper matching Shadcn Input Styles */}
                    <div className="flex h-10 w-full items-center rounded-md border border-input bg-background pl-3 pr-10 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 relative">
                        {/* @ts-ignore */}
                        <gmpx-place-picker
                            key={resetKey}
                            ref={pickerRef}
                            placeholder={placeholder}
                            style={{
                                width: '100%',
                                background: 'transparent',
                                border: 'none',
                                outline: 'none'
                                // Removed paddingLeft (was 24px)
                            }}
                        />

                        {/* Clear Button - Shows only when there is a value */}
                        {currentValue && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                                aria-label="Clear address"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Show loading state while waiting for API Key injection */}
            {!apiReady && (
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground opacity-50 cursor-not-allowed">
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Initializing Maps...
                </div>
            )}

            {/* Hidden Input for Form Submission compliance */}
            <input type="hidden" name={name} value={currentValue} />
            <input type="hidden" name="latitude" value={coordinates.lat} />
            <input type="hidden" name="longitude" value={coordinates.lng} />
        </div>
    );
}

