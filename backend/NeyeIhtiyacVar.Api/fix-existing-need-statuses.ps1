$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar\backend\NeyeIhtiyacVar.Api"
$migrationPath = Join-Path $root "Migrations\20260908204228_FixExistingNeedStatuses.cs"

if (-not (Test-Path $migrationPath)) {
    throw "Migration dosyasi bulunamadi: $migrationPath"
}

$content = @'
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    public partial class FixExistingNeedStatuses : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
UPDATE ""NeedRequests"" AS n
SET
    ""Status"" =
        CASE
            WHEN EXISTS (
                SELECT 1
                FROM ""ProviderOffers"" AS o
                WHERE o.""NeedRequestId"" = n.""Id""
                  AND o.""Status"" = 'Accepted'
            ) THEN 'Completed'

            WHEN EXISTS (
                SELECT 1
                FROM ""ProviderOffers"" AS o
                WHERE o.""NeedRequestId"" = n.""Id""
                  AND o.""Status"" = 'Pending'
            ) THEN 'OfferReceived'

            ELSE 'Open'
        END,

    ""UpdatedAtUtc"" =
        CASE
            WHEN n.""UpdatedAtUtc"" = '-infinity'::timestamptz
                THEN n.""CreatedAtUtc""
            ELSE n.""UpdatedAtUtc""
        END;
");

            migrationBuilder.Sql(@"
ALTER TABLE ""NeedRequests""
ALTER COLUMN ""Status"" DROP DEFAULT;
");

            migrationBuilder.Sql(@"
ALTER TABLE ""NeedRequests""
ALTER COLUMN ""UpdatedAtUtc"" DROP DEFAULT;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
UPDATE ""NeedRequests""
SET ""Status"" = '';
");

            migrationBuilder.Sql(@"
ALTER TABLE ""NeedRequests""
ALTER COLUMN ""Status"" SET DEFAULT '';
");

            migrationBuilder.Sql(@"
ALTER TABLE ""NeedRequests""
ALTER COLUMN ""UpdatedAtUtc"" SET DEFAULT '-infinity'::timestamptz;
");
        }
    }
}
'@

[System.IO.File]::WriteAllText(
    $migrationPath,
    $content,
    (New-Object System.Text.UTF8Encoding($false))
)

Write-Host ""
Write-Host "FixExistingNeedStatuses migration dosyasi duzeltildi." -ForegroundColor Green
Write-Host "Dosya:" -ForegroundColor Cyan
Write-Host "  $migrationPath"
Write-Host ""
Write-Host "Siradaki adimlar:" -ForegroundColor Yellow
Write-Host "  dotnet build"
Write-Host "  dotnet ef database update"
