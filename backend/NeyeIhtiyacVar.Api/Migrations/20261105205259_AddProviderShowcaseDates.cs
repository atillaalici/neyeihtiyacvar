using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProviderShowcaseDates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ShowcaseExpiresAtUtc",
                table: "Providers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ShowcaseStartedAtUtc",
                table: "Providers",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ShowcaseExpiresAtUtc",
                table: "Providers");

            migrationBuilder.DropColumn(
                name: "ShowcaseStartedAtUtc",
                table: "Providers");
        }
    }
}
