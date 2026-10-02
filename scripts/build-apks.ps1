# Build & Distribute APKs Script for Salik Fast Food
param(
  [string]$Target = "all" # "customer", "admin", or "all"
)

$ErrorActionPreference = "Stop"
$jdk21 = "C:\Users\M.Salik Leo\.jdks\jbr-21.0.11"
if (Test-Path $jdk21) {
  $env:JAVA_HOME = $jdk21
} else {
  $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
}
$baseDir = Split-Path -Parent $PSScriptRoot

# Ensure output directories exist
$apkDir = Join-Path $baseDir "APKs"
$publicDownDir = Join-Path $baseDir "public\downloads"
$distDownDir = Join-Path $baseDir "dist\downloads"

New-Item -ItemType Directory -Force -Path $apkDir | Out-Null
New-Item -ItemType Directory -Force -Path $publicDownDir | Out-Null
if (Test-Path (Join-Path $baseDir "dist")) {
  New-Item -ItemType Directory -Force -Path $distDownDir | Out-Null
}

# Auto-bump build numbers safely via node
node (Join-Path $baseDir "scripts\bump-version.js") $Target

function Build-Customer {
  Write-Host ">>> Building Customer Mobile Web Assets..." -ForegroundColor Cyan
  Set-Location $baseDir
  npm run build:customer
  
  Write-Host ">>> Compiling Customer Android APK with Gradle..." -ForegroundColor Cyan
  Set-Location (Join-Path $baseDir "Mobile\customer\android")
  .\gradlew clean assembleDebug
  
  $builtApk = Join-Path $baseDir "Mobile\customer\android\app\build\outputs\apk\debug\app-debug.apk"
  if (Test-Path $builtApk) {
    Copy-Item -Path $builtApk -Destination (Join-Path $apkDir "Salik-Fast-Food-Customer.apk") -Force
    Copy-Item -Path $builtApk -Destination (Join-Path $publicDownDir "Salik-Fast-Food-Customer.apk") -Force
    if (Test-Path $distDownDir) {
      Copy-Item -Path $builtApk -Destination (Join-Path $distDownDir "Salik-Fast-Food-Customer.apk") -Force
    }
    Write-Host "[SUCCESS] Customer APK copied to APKs, public/downloads, and dist/downloads!" -ForegroundColor Green
  } else {
    Write-Host "[ERROR] Customer APK build output not found!" -ForegroundColor Red
  }
}

function Build-Admin {
  Write-Host ">>> Building Admin Mobile Web Assets..." -ForegroundColor Cyan
  Set-Location $baseDir
  npm run build:admin
  
  Write-Host ">>> Compiling Admin Android APK with Gradle..." -ForegroundColor Cyan
  Set-Location (Join-Path $baseDir "Mobile\admin\android")
  .\gradlew clean assembleDebug
  
  $builtApk = Join-Path $baseDir "Mobile\admin\android\app\build\outputs\apk\debug\app-debug.apk"
  if (Test-Path $builtApk) {
    Copy-Item -Path $builtApk -Destination (Join-Path $apkDir "Salik-Fast-Food-Admin.apk") -Force
    Copy-Item -Path $builtApk -Destination (Join-Path $publicDownDir "Salik-Fast-Food-Admin.apk") -Force
    if (Test-Path $distDownDir) {
      Copy-Item -Path $builtApk -Destination (Join-Path $distDownDir "Salik-Fast-Food-Admin.apk") -Force
    }
    Write-Host "[SUCCESS] Admin APK copied to APKs, public/downloads, and dist/downloads!" -ForegroundColor Green
  } else {
    Write-Host "[ERROR] Admin APK build output not found!" -ForegroundColor Red
  }
}

function Build-Rider {
  Write-Host ">>> Building Rider Mobile Web Assets..." -ForegroundColor Cyan
  Set-Location $baseDir
  npm run build:rider
  
  Write-Host ">>> Compiling Rider Android APK with Gradle..." -ForegroundColor Cyan
  Set-Location (Join-Path $baseDir "Mobile\rider\android")
  .\gradlew clean assembleDebug
  
  $builtApk = Join-Path $baseDir "Mobile\rider\android\app\build\outputs\apk\debug\app-debug.apk"
  if (Test-Path $builtApk) {
    Copy-Item -Path $builtApk -Destination (Join-Path $apkDir "Salik-Fast-Food-Rider.apk") -Force
    Copy-Item -Path $builtApk -Destination (Join-Path $publicDownDir "Salik-Fast-Food-Rider.apk") -Force
    if (Test-Path $distDownDir) {
      Copy-Item -Path $builtApk -Destination (Join-Path $distDownDir "Salik-Fast-Food-Rider.apk") -Force
    }
    Write-Host "[SUCCESS] Rider APK copied to APKs, public/downloads, and dist/downloads!" -ForegroundColor Green
  } else {
    Write-Host "[ERROR] Rider APK build output not found!" -ForegroundColor Red
  }
}

try {
  if ($Target -eq "customer") {
    Build-Customer
  } elseif ($Target -eq "admin") {
    Build-Admin
  } elseif ($Target -eq "rider") {
    Build-Rider
  } else {
    Build-Customer
    Build-Admin
    Build-Rider
  }
} finally {
  Set-Location $baseDir
}

