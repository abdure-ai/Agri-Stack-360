# Convert Word documents (.doc / .docx) to PDF with Microsoft Word, keeping page layout
# so the knowledge base can cite page numbers.
#
#   powershell -ExecutionPolicy Bypass -File scripts\convert_word_to_pdf.ps1 -Source docs\Wheat -Target data\knowledge\moa
#
# Existing PDFs are skipped unless -Force is given.
param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Target,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$src = (Resolve-Path $Source).Path
New-Item -ItemType Directory -Force -Path $Target | Out-Null
$dst = (Resolve-Path $Target).Path

$files = Get-ChildItem -Path $src -File | Where-Object { $_.Extension -in '.doc', '.docx' }
if (-not $files) { Write-Output "No .doc/.docx files in $src"; exit 0 }

function Get-AsciiName([string]$name) {
    # Word hangs (invisibly) saving to a path with Ethiopic characters, so output names are ASCII.
    $ascii = ($name -replace '[^A-Za-z0-9]+', '-').Trim('-').ToLowerInvariant()
    if (-not $ascii) { $ascii = 'document' }
    return $ascii
}

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$word.AutomationSecurity = 3     # msoAutomationSecurityForceDisable: never prompt about macros
try {
    foreach ($f in $files) {
        $out = Join-Path $dst ((Get-AsciiName $f.BaseName) + '.pdf')
        if ((Test-Path $out) -and -not $Force) { Write-Output "skip  $($f.Name) (PDF exists)"; continue }
        $doc = $word.Documents.Open($f.FullName, $false, $true)   # ConfirmConversions, ReadOnly
        try {
            $pages = $doc.ComputeStatistics(2)                     # wdStatisticPages
            $doc.SaveAs2($out, 17)                                 # wdFormatPDF
            Write-Output "ok    $($f.Name) -> $([IO.Path]::GetFileName($out)) ($pages pages)"
        } finally {
            $doc.Close($false)
        }
    }
} finally {
    $word.Quit()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word)
}
