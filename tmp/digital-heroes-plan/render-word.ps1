$ErrorActionPreference='Stop'
$word=$null
$document=$null
try {
    $word=New-Object -ComObject Word.Application
    $word.Visible=$false
    $word.DisplayAlerts=0
    $document=$word.Documents.Open('E:\GreenImpact_Shwetal\outputs\digital-heroes-plan\Digital_Heroes_Codex_Prompts.docx',$false,$true)
    $document.Repaginate()
    $pages=$document.ComputeStatistics(2)
    $document.ExportAsFixedFormat('E:\GreenImpact_Shwetal\tmp\digital-heroes-plan\word-render.pdf',17)
    Write-Output "Rendered pages: $pages"
} finally {
    if ($document) {$document.Close(0)}
    if ($word) {$word.Quit()}
}
