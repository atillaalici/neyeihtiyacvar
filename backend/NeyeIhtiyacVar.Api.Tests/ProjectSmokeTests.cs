using System.Text.Json;

namespace NeyeIhtiyacVar.Api.Tests;

public sealed class ProjectSmokeTests
{
    [Fact]
    public void Production_appsettings_should_not_contain_secrets()
    {
        var projectRoot = FindProjectRoot();
        var path = Path.Combine(
            projectRoot,
            "backend",
            "NeyeIhtiyacVar.Api",
            "appsettings.Production.json");

        Assert.True(File.Exists(path), $"Dosya bulunamadi: {path}");

        using var doc = JsonDocument.Parse(File.ReadAllText(path));
        var json = doc.RootElement.GetRawText();

        Assert.DoesNotContain("CHANGE_ME", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Password=", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("ApiKey", json, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Ubuntu_deploy_templates_should_exist()
    {
        var projectRoot = FindProjectRoot();

        Assert.True(File.Exists(Path.Combine(
            projectRoot,
            "deploy",
            "systemd",
            "neyeihtiyacvar-api.service")));

        Assert.True(File.Exists(Path.Combine(
            projectRoot,
            "deploy",
            "systemd",
            "neyeihtiyacvar-web.service")));

        Assert.True(File.Exists(Path.Combine(
            projectRoot,
            "deploy",
            "nginx",
            "neyeihtiyacvar.conf")));
    }

    private static string FindProjectRoot()
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);

        while (current is not null)
        {
            if (Directory.Exists(Path.Combine(current.FullName, "frontend")) &&
                Directory.Exists(Path.Combine(current.FullName, "backend")))
            {
                return current.FullName;
            }

            current = current.Parent;
        }

        throw new DirectoryNotFoundException(
            "Neye Ihtiyac Var proje koku bulunamadi.");
    }
}