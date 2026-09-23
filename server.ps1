$ports = @(3000, 3001, 8080, 5500, 8000)
$listener = $null
$activePort = $null

foreach ($p in $ports) {
    try {
        $l = New-Object System.Net.HttpListener
        $l.Prefixes.Add("http://localhost:$p/")
        $l.Prefixes.Add("http://127.0.0.1:$p/")
        $l.Start()
        $listener = $l
        $activePort = $p
        Write-Output "La Sabroso Local HTTP Server running at http://localhost:$p/"
        break
    } catch {
        # try next
    }
}

if (-not $listener) {
    Write-Error "Could not bind to any port in list."
    exit 1
}

$baseDir = $PSScriptRoot

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $rawPath = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath).TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($rawPath)) { $rawPath = "index.html" }
        
        $localPath = [System.IO.Path]::Combine($baseDir, $rawPath.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
        
        if ([System.IO.File]::Exists($localPath)) {
            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            
            $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
            switch ($ext) {
                ".html" { $response.ContentType = "text/html; charset=utf-8" }
                ".css"  { $response.ContentType = "text/css; charset=utf-8" }
                ".js"   { $response.ContentType = "application/javascript; charset=utf-8" }
                ".json" { $response.ContentType = "application/json; charset=utf-8" }
                ".avif" { $response.ContentType = "image/avif" }
                ".webp" { $response.ContentType = "image/webp" }
                ".jpg"  { $response.ContentType = "image/jpeg" }
                ".jpeg" { $response.ContentType = "image/jpeg" }
                ".png"  { $response.ContentType = "image/png" }
                ".svg"  { $response.ContentType = "image/svg+xml" }
                ".woff2" { $response.ContentType = "font/woff2" }
                ".woff" { $response.ContentType = "font/woff" }
                ".ttf"  { $response.ContentType = "font/ttf" }
                ".otf"  { $response.ContentType = "font/otf" }
                default { $response.ContentType = "application/octet-stream" }
            }
            
            $response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")
            $response.AddHeader("Pragma", "no-cache")
            $response.AddHeader("Expires", "0")
            $response.ContentLength64 = $bytes.Length
            if ($request.HttpMethod -ne "HEAD") {
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rawPath")
            $response.ContentLength64 = $msg.Length
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $response.Close()
    } catch {
        # continue loop
    }
}
