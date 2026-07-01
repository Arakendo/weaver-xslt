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

Enable / Disable control

The integration provides multiple ways to enable or disable at different scopes:

- Per-project: set in your project file

```xml
<PropertyGroup>
  <WeaverEnabled>false</WeaverEnabled> <!-- disable for this project -->
</PropertyGroup>
```

- Design-time builds (IDE evaluation): the targets are skipped during design-time by default.
  To enable compilation during design-time (not recommended), set:

```xml
<PropertyGroup>
  <WeaverDesignTimeEnabled>true</WeaverDesignTimeEnabled>
</PropertyGroup>
```

- Repo-level toggle (CI or quick local override): create a top-level Directory.Build.Weaver.props
  at the repository root with the following contents to disable across the repo:

```xml
<Project>
  <PropertyGroup>
    <WeaverEnabled>false</WeaverEnabled>
  </PropertyGroup>
</Project>
```

Repository helper scripts (provided):
- `scripts/disable-weaver.sh` — create Directory.Build.Weaver.props to disable the Weaver targets for local development/CI.
- `scripts/enable-weaver.sh` — remove the auto-generated Directory.Build.Weaver.props to re-enable default behavior.

Notes & next steps
- Production packaging should allow opt-in bundled Node and a stable carrier. The current scaffold is for local validation only.
- The README here contains recommended toggles but a packaged Weaver.Build NuGet should document the same controls in its package README and docs/NUGET_INTEGRATION.md.

Refer to docs/NUGET_INTEGRATION.md for the full plan and acceptance criteria.
