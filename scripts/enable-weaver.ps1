# PowerShell variant to re-enable Weaver.Build by removing the repo-level override
$root = (git rev-parse --show-toplevel) -replace '\r|\n',''
$target = "$root\Directory.Build.Weaver.props"
if (Test-Path $target) { Remove-Item $target -Force; Write-Output "Removed $target" } else { Write-Output "$target did not exist" }
