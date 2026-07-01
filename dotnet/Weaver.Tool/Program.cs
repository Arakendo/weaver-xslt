using System.Diagnostics;

var baseDirectory = AppContext.BaseDirectory;
var arguments = args;

var cliPath = ResolveCliPath(baseDirectory);
if (cliPath is null)
{
    Console.Error.WriteLine($"Weaver.Tool could not find the packaged CLI relative to {baseDirectory}.");
    return 1;
}

var nodeExecutable = ResolveNodeExecutable(arguments, out var forwardedArguments);
if (string.IsNullOrWhiteSpace(nodeExecutable))
{
    Console.Error.WriteLine("Weaver.Tool requires a Node executable. Pass --node-path <path> or set WEAVER_NODE.");
    return 1;
}

var processStartInfo = new ProcessStartInfo
{
    FileName = nodeExecutable,
    UseShellExecute = false,
};

processStartInfo.ArgumentList.Add(cliPath);
foreach (var argument in forwardedArguments)
{
    processStartInfo.ArgumentList.Add(argument);
}

using var process = Process.Start(processStartInfo);
if (process is null)
{
    Console.Error.WriteLine($"Weaver.Tool failed to start Node executable '{nodeExecutable}'.");
    return 1;
}

process.WaitForExit();
return process.ExitCode;

static string? ResolveCliPath(string baseDirectory)
{
    var candidates = new[]
    {
        Path.Combine(baseDirectory, "dist", "cli.js"),
        Path.GetFullPath(Path.Combine(baseDirectory, "..", "..", "..", "..", "..", "dist", "cli.js")),
        Path.Combine(baseDirectory, "weaver-xslt.js"),
    };

    return candidates.FirstOrDefault(File.Exists);
}

static string ResolveNodeExecutable(string[] arguments, out IReadOnlyList<string> forwardedArguments)
{
    var forwarded = new List<string>(arguments.Length);
    string? explicitNodePath = null;

    for (var index = 0; index < arguments.Length; index += 1)
    {
        var argument = arguments[index];
        if (argument == "--node-path")
        {
            if (index + 1 >= arguments.Length)
            {
                throw new InvalidOperationException("--node-path requires a value.");
            }

            explicitNodePath = arguments[index + 1];
            index += 1;
            continue;
        }

        forwarded.Add(argument);
    }

    forwardedArguments = forwarded;
    return explicitNodePath
        ?? Environment.GetEnvironmentVariable("WEAVER_NODE")
        ?? "node";
}