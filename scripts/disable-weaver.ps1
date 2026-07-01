# PowerShell variant to disable Weaver.Build
$root = (git rev-parse --show-toplevel) -replace '\r|\n',''
$target = "$root\Directory.Build.Weaver.props"
@"
<Project>
  <PropertyGroup>
    <WeaverEnabled>false</WeaverEnabled>
  </PropertyGroup>
</Project>
"@ | Out-File -FilePath $target -Encoding utf8
Write-Output "Created $target to disable Weaver.Build targets."
