# Weaver.Build (scaffold)

This folder contains a minimal scaffold for a Weaver MSBuild integration package.

Purpose
- Provide an MSBuild props/targets pair that lets .NET projects compile `.xsl`
  stylesheets during build/publish and stage the emitted artifacts in the app output.

Current scaffolded files
- build/Weaver.Build.props — default properties for the integration
- build/Weaver.Build.targets — simple targets to invoke the Weaver CLI for each stylesheet

How to use (sample)
1. Reference the eventual `Weaver.Build` NuGet package (or add this project to your repo).
2. Add stylesheets to your project:

```xml
<ItemGroup>
  <WeaverStylesheet Include="Stylesheets/**/*.xsl" />
</ItemGroup>
```

3. `dotnet build` will run the integration before build and emit artifacts under
   `$(IntermediateOutputPath)weaver/` and copy them into the app output if
   `WeaverCopyToOutput` is enabled.

Notes & next steps
- This is intentionally minimal:
  - it uses an Exec to invoke a Node-backed CLI; a real carrier package (`Weaver.Tool`)
    should place the CLI under `tools/weaver/` and provide a stable path for the targets.
  - diagnostics are not yet parsed as machine-readable payloads—adding a JSON
    diagnostics output and mapping to MSBuild errors/warnings is a near-term follow-up.
  - incrementality based on include/import dependency sidecars is also planned.

Refer to docs/NUGET_INTEGRATION.md for the full plan and acceptance criteria.
