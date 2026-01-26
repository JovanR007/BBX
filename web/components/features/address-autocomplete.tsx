"use client";

import { useEffect, useRef, useState } from "react";
// Import the Google Maps Extended Component Library web components
import "@googlemaps/extended-component-library/place_picker.js";
import "@googlemaps/extended-component-library/api_loader.js";



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

    // Attach event listener for place changes
    useEffect(() => {
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
    }, [onAddressSelect]);

    return (
        <div className="relative w-full">
            {/* API Loader handles the Google Maps script injection */}
            <gmpx-api-loader
                key={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                solution-channel="GMP_GE_placepicker_v2"
            />

            {/* The Place Picker Web Component */}
            <div className="w-full">
                <gmpx-place-picker
                    ref={pickerRef}
                    placeholder={placeholder}
                    // Apply rudimentary styling to match internal inputs (web components are isolated but inherit some fonts)
                    style={{ width: '100%' }}
                />
            </div>

            {/* Hidden Input for Form Submission compliance if needed */}
            <input type="hidden" name={name} />
        </div>
    );
}
