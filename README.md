# NetBox Brady Label Printer

A premium React application built with Vite that bridges your NetBox infrastructure directly with Brady label printers via the browser. Specifically optimized for the **Brady M511 Printer** and **M5-01-425-FT** (1.181" x 1.575") size labels.

## Features

- **Direct Web Printing**: Leverages the [Brady Web SDK](https://sdk.bradyid.com/) over the Web Bluetooth API to slice and print labels natively from the browser without secondary desktop drivers.
- **NetBox Integration**: Pull device metadata (ID, Name, Type, Role, IP) straight from your NetBox REST API into a pixel-perfect canvas rendering.
- **Cloudflare & CORS Bypass**: For instances like `demo.netbox.dev`, an integrated dev proxy avoids generic backend 530 blockages and browser-side CORS headaches.
- **Modern & Premium UI**: Built with pure CSS delivering a stunning dark mode interface accented with active glows and dynamic toggles.

## Prerequisites

- **Bluetooth Support**: Your browser must support the Web Bluetooth API (e.g., Google Chrome or Microsoft Edge). Safari is currently **not** supported by the SDK.
- **NetBox Token**: If your targeted NetBox requires authentication (such as `demo.netbox.dev`), generate an API Token within NetBox by logging in and navigating to your profile's API tokens page.

## Running Locally

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Development Server**
   ```bash
   npm run dev
   ```

3. **Access the App**
   Open `http://localhost:5173` in a supportive browser. Ensure your host machine's Bluetooth is enabled.

## Technologies Used

- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Brady Web SDK](https://www.npmjs.com/package/@bradycorporation/brady-web-sdk)
- [Lucide React](https://lucide.dev/) for iconography
- Vanilla CSS for styling
