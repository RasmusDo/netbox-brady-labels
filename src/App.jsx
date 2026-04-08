import { useState, useEffect, useRef } from 'react';
import { Printer, Settings, Printer as PrinterIcon, Box, Unplug, Loader2, Info, Eye, EyeOff } from 'lucide-react';
import BradySdk from '@bradycorporation/brady-web-sdk';
import './index.css';

export default function App() {
  const [netboxUrl, setNetboxUrl] = useState('https://demo.netbox.dev');
  const [apiToken, setApiToken] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [useCorsProxy, setUseCorsProxy] = useState(true);
  const [showApiToken, setShowApiToken] = useState(false);
  const [deviceData, setDeviceData] = useState(null);
  
  const [printerStatus, setPrinterStatus] = useState('disconnected');
  const [bradySdk, setBradySdk] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  const canvasRef = useRef(null);

  // M5-01-425-FT label at 300 DPI:
  // Width: 1.181 inch -> 354 px
  // Height: 1.575 inch -> 472 px
  const CANVAS_WIDTH = 354;
  const CANVAS_HEIGHT = 472;

  useEffect(() => {
    try {
      const sdk = new BradySdk((update) => {
        console.log("Printer status update:", update);
        if (update && update.connected !== undefined) {
           setPrinterStatus(update.connected ? 'connected' : 'disconnected');
        } else if (typeof update === 'string') {
           setPrinterStatus(update.toLowerCase().includes('connect') ? 'connected' : 'disconnected');
        }
      });
      setBradySdk(sdk);
    } catch (e) {
      console.error("Failed to init Brady SDK", e);
    }
  }, []);

  useEffect(() => {
    drawLabel();
  }, [deviceData]);

  const drawLabel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear background to white
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw borders/text
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    
    ctx.strokeRect(10, 10, CANVAS_WIDTH - 20, CANVAS_HEIGHT - 20);
    ctx.textAlign = 'center';
    
    if (deviceData) {
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(deviceData.name || 'UNKNOWN DEVICE', CANVAS_WIDTH / 2, 70);
      
      ctx.font = '24px sans-serif';
      ctx.fillText(`Role: ${deviceData.device_role?.name || 'N/A'}`, CANVAS_WIDTH / 2, 120);
      ctx.fillText(`Type: ${deviceData.device_type?.model || 'N/A'}`, CANVAS_WIDTH / 2, 160);
      ctx.fillText(`Site: ${deviceData.site?.name || 'N/A'}`, CANVAS_WIDTH / 2, 200);

      ctx.beginPath();
      ctx.moveTo(30, 230);
      ctx.lineTo(CANVAS_WIDTH - 30, 230);
      ctx.stroke();

      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`NetBox ID: ${deviceData.id}`, CANVAS_WIDTH / 2, 270);
      
      ctx.fillRect(50, 300, CANVAS_WIDTH - 100, 80);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '24px monospace';
      ctx.fillText('|| | ||| | || |', CANVAS_WIDTH / 2, 345);

    } else {
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('NO DATA', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }
  };

  const connectPrinter = async () => {
    if (!bradySdk) return;
    setIsConnecting(true);
    setError('');
    try {
      await bradySdk.connect();
      setPrinterStatus('connected');
    } catch (err) {
      console.error(err);
      setError(`Printer Connection Failed: ${err.message || 'Unknown error. Note: Safari not supported.'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchNetboxData = async () => {
    if (!deviceId || !netboxUrl) {
      setError('Please provide NetBox URL and Device/Cable ID');
      return;
    }
    
    setIsFetching(true);
    setError('');
    setDeviceData(null);
    
    try {
      const headers = {
        'Accept': 'application/json',
      };
      if (apiToken) {
         headers['Authorization'] = `Token ${apiToken}`;
      }
      
      let cleanUrl = netboxUrl;
      if (cleanUrl.endsWith('/')) {
        cleanUrl = cleanUrl.slice(0, -1);
      }

      let fetchUrl = `${cleanUrl}/api/dcim/devices/${deviceId}/`;
      
      // Use local dev proxy to sidestep Cloudflare 530 block and browser CORS
      if (useCorsProxy) {
        headers['x-target-url'] = cleanUrl;
        fetchUrl = `/local-proxy/api/dcim/devices/${deviceId}/`;
      }

      const res = await fetch(fetchUrl, { headers });
      
      if (!res.ok) {
        // demo.netbox.dev throws 403 / 401 if unauthorized
        if (res.status === 401 || res.status === 403) {
          throw new Error('Unauthorized: demo.netbox.dev requires a valid API token for devices. Provide one in settings.');
        } 
        throw new Error(`NetBox API error: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      setDeviceData(data);
    } catch (err) {
      console.error(err);
      if (err.message.includes('Failed to fetch')) {
        setError('Failed to fetch: Browser blocked request due to CORS. Try enabling the CORS Bypass Proxy option.');
      } else {
        setError(err.message);
      }
    } finally {
      setIsFetching(false);
    }
  };

  const printLabel = async () => {
    if (!bradySdk || printerStatus !== 'connected') {
      setError('Printer not connected');
      return;
    }
    
    try {
      const canvas = canvasRef.current;
      const dataUrl = canvas.toDataURL('image/png');
      const base64Data = dataUrl.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');

      if (typeof bradySdk.printImage === 'function') {
         await bradySdk.printImage(base64Data);
      } else if (typeof bradySdk.print === 'function') {
         await bradySdk.print(base64Data);
      } else if (typeof bradySdk.printBitmap === 'function') {
         await bradySdk.printBitmap(base64Data);
      } else {
         setError('SDK Print method not found. Check Brady web sdk documentation.');
      }
    } catch (err) {
      console.error(err);
      setError(`Print failed: ${err.message}`);
    }
  };

  return (
    <>
      <header>
        <div>
          <h1>NetBox Labeling</h1>
          <p>M511 Printer with M5-01-425-FT Labels (1.18" x 1.57")</p>
        </div>
        <div className={`status-badge ${printerStatus}`}>
          <div className={`w-2 h-2 rounded-full ${printerStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'}`}></div>
          {printerStatus === 'connected' ? 'Printer Ready' : 'Offline'}
        </div>
      </header>

      {error && (
        <div className="panel" style={{ borderColor: 'var(--danger)', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
          <p style={{ color: 'var(--danger)', fontWeight: 500, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Info size={18}/> {error}
          </p>
        </div>
      )}

      <main className="grid">
        <div className="left-column">
          <div className="panel">
            <h2><Settings size={20} style={{display: 'inline', marginRight: 8, verticalAlign: 'text-bottom'}} /> NetBox Connection</h2>
            <div className="form-group">
              <label>NetBox URL</label>
              <input 
                type="url" 
                value={netboxUrl} 
                onChange={(e) => setNetboxUrl(e.target.value)} 
                placeholder="https://netbox.yourdomain.com" 
              />
            </div>
            <div className="form-group">
              <label>API Token</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showApiToken ? "text" : "password"} 
                  value={apiToken} 
                  onChange={(e) => setApiToken(e.target.value)} 
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxx" 
                  style={{ paddingRight: '40px' }}
                />
                <button 
                  type="button"
                  onClick={() => setShowApiToken(!showApiToken)}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    height: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    padding: '0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                  className="secondary"
                >
                  {showApiToken ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p style={{fontSize: '0.75rem', marginTop: '4px'}}>
                demo.netbox.dev requires a valid API token to read devices. Log in there with admin/admin to create one!
              </p>
            </div>
            <div className="form-group" style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px'}}>
              <input 
                type="checkbox" 
                id="cors-proxy"
                checked={useCorsProxy} 
                onChange={(e) => setUseCorsProxy(e.target.checked)} 
                style={{width: 'auto'}}
              />
              <label htmlFor="cors-proxy" style={{marginBottom: 0, cursor: 'pointer'}}>Use Local CORS Bypass Proxy</label>
            </div>
            <p style={{fontSize: '0.75rem'}}>Check this if getting 'Failed to fetch' due to CORS on target host.</p>
          </div>

          <div className="panel">
            <h2><Box size={20} style={{display: 'inline', marginRight: 8, verticalAlign: 'text-bottom'}} /> Device Selection</h2>
            <div className="form-group">
              <label>Device ID</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  value={deviceId} 
                  onChange={(e) => setDeviceId(e.target.value)} 
                  placeholder="e.g. 1" 
                  style={{flex: 1}}
                />
                <button onClick={fetchNetboxData} disabled={isFetching}>
                  {isFetching ? <Loader2 className="animate-spin" size={18}/> : 'Fetch'}
                </button>
              </div>
            </div>
            
            {deviceData && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <h3 style={{fontSize: '1rem', marginBottom: '0.25rem', color: 'var(--success)'}}>{deviceData.name}</h3>
                <p style={{fontSize: '0.85rem'}}><strong>IP:</strong> {deviceData.primary_ip?.address || 'N/A'}</p>
                <p style={{fontSize: '0.85rem'}}><strong>Model:</strong> {deviceData.device_type?.model || 'N/A'}</p>
              </div>
            )}
          </div>
        </div>

        <div className="right-column">
          <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2><PrinterIcon size={20} style={{display: 'inline', marginRight: 8, verticalAlign: 'text-bottom'}}/> Label Preview & Print</h2>
            <p style={{fontSize: '0.875rem', marginBottom: '1rem'}}>
              Optimized for M5-01-425-FT (1.181" x 1.575")
            </p>
            
            <div className="label-preview flex-1" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <canvas 
                ref={canvasRef} 
                className="label-canvas" 
                width={CANVAS_WIDTH} 
                height={CANVAS_HEIGHT}
                style={{ width: '236px', height: '315px' }} 
              ></canvas>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                className="secondary" 
                onClick={connectPrinter} 
                disabled={isConnecting || printerStatus === 'connected'}
                style={{ flex: 1 }}
              >
                {isConnecting ? <Loader2 className="animate-spin" size={18}/> : <Unplug size={18}/>}
                {printerStatus === 'connected' ? 'Connected' : 'Connect Printer'}
              </button>
              <button 
                className="success"
                onClick={printLabel}
                disabled={printerStatus !== 'connected' || !deviceData}
                style={{ flex: 1 }}
              >
                <Printer size={18}/>
                Print Label
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
