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
    const loaderRef = useRef<any>(null);

    useEffect(() => {
        if (loaderRef.current && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
            loaderRef.current.setAttribute("key", process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
        }
    }, []);

    return (
        <div className="relative w-full">
            {/* API Loader handles the Google Maps script injection */}
            {/* @ts-ignore */}
            <gmpx-api-loader
                ref={loaderRef}
                solution-channel="GMP_GE_placepicker_v2"
            />

            {/* The Place Picker Web Component */}
            <div className="w-full">
                {/* @ts-ignore */}
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
