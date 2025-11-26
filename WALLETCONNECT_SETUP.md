# WalletConnect QR Code Loading Issue - Fix Guide

## Problem
The WalletConnect QR code keeps loading and you see a `403 (Forbidden)` error from `pulse.walletconnect.org`.

## Root Cause
Your domain `eshare-two.vercel.app` is not whitelisted in your WalletConnect Cloud project settings.

## Solution

### Step 1: Go to WalletConnect Cloud Dashboard

1. Visit [WalletConnect Cloud Dashboard](https://cloud.walletconnect.com/)
2. Sign in with your account
3. Find your project with ID: `9f2b0ea728cc3bb3110fff021ace29cf`

### Step 2: Add Allowed Domains

1. Go to your project settings
2. Navigate to **"App Settings"** or **"Allowed Domains"**
3. Add the following domains:
   - `eshare-two.vercel.app` (your production domain)
   - `localhost:5173` (for local development)
   - `localhost` (alternative for local dev)

### Step 3: Save and Wait

1. Save the changes
2. Wait 1-2 minutes for changes to propagate
3. Clear your browser cache or do a hard refresh (Ctrl+F5)

### Step 4: Test Again

1. Refresh your app
2. Try connecting with WalletConnect again
3. The QR code should now load properly

## Alternative: Check Project ID

If you can't find the project, verify your Project ID is correct:

- Current Project ID in `.env`: `9f2b0ea728cc3bb3110fff021ace29cf`
- Make sure this matches the Project ID in WalletConnect Cloud

## Quick Test

After adding the domain, check the browser console:
- The `403` error should disappear
- The QR code should appear instead of loading indefinitely
- You should see successful WebSocket connections to WalletConnect

## Notes

- Domain whitelisting is required for WalletConnect v2
- Each domain must be explicitly added
- Changes can take a few minutes to propagate
- Make sure you're using the exact domain (with or without `www` as configured)

