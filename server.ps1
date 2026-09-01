$port = 8000
$folder = "h:\Projects\rook-soundboard"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "🎵 Rook Soundboard Server Running" -ForegroundColor Green
Write-Host "Open: http://localhost:$port" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Yellow

try {
    while ($true) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        $response.AddHeader("Access-Control-Allow-Origin", "*")

        $path = $request.Url.LocalPath
        if ($path -eq "/") { $path = "/index.html" }
        
        $filePath = Join-Path $folder $path.TrimStart("/")
        
        try {
            if (Test-Path $filePath) {
                $file = Get-Item $filePath
                if ($file.PSIsContainer) {
                    $response.StatusCode = 403
                    $response.Close()
                } else {
                    $bytes = [System.IO.File]::ReadAllBytes($filePath)
                    $ext = [System.IO.Path]::GetExtension($filePath)
                    
                    $contentType = @{
                        ".html" = "text/html"
                        ".js"   = "application/javascript"
                        ".json" = "application/json"
                        ".wav"  = "audio/wav"
                        ".svg"  = "image/svg+xml"
                        ".css"  = "text/css"
                    }[$ext] ?? "application/octet-stream"
                    
                    $response.ContentType = $contentType
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                    $response.StatusCode = 200
                }
            } else {
                $response.StatusCode = 404
            }
        } catch {
            $response.StatusCode = 500
        }
        
        $response.Close()
        Write-Host "$($request.HttpMethod) $path - $($response.StatusCode)" -ForegroundColor Gray
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
