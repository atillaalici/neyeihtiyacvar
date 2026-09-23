using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProviderModerationEnforcement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastModerationViolationAtUtc",
                table: "Providers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastModerationViolationReason",
                table: "Providers",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ModerationTerminated",
                table: "Providers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "ModerationViolationCount",
                table: "Providers",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastModerationViolationAtUtc",
                table: "Providers");

            migrationBuilder.DropColumn(
                name: "LastModerationViolationReason",
                table: "Providers");

            migrationBuilder.DropColumn(
                name: "ModerationTerminated",
                table: "Providers");

            migrationBuilder.DropColumn(
                name: "ModerationViolationCount",
                table: "Providers");
        }
    }
}
