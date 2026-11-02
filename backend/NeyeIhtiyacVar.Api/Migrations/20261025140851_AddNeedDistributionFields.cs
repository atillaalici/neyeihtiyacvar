using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddNeedDistributionFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AcceptingNewOffers",
                table: "NeedRequests",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "AutoClosedAtUtc",
                table: "NeedRequests",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "DistributionEnabled",
                table: "NeedRequests",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "DistributionStage",
                table: "NeedRequests",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "District");

            migrationBuilder.AddColumn<DateTime>(
                name: "DistributionUpdatedAtUtc",
                table: "NeedRequests",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_NeedRequests_DistributionStage",
                table: "NeedRequests",
                column: "DistributionStage");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_NeedRequests_DistributionStage",
                table: "NeedRequests");

            migrationBuilder.DropColumn(
                name: "AcceptingNewOffers",
                table: "NeedRequests");

            migrationBuilder.DropColumn(
                name: "AutoClosedAtUtc",
                table: "NeedRequests");

            migrationBuilder.DropColumn(
                name: "DistributionEnabled",
                table: "NeedRequests");

            migrationBuilder.DropColumn(
                name: "DistributionStage",
                table: "NeedRequests");

            migrationBuilder.DropColumn(
                name: "DistributionUpdatedAtUtc",
                table: "NeedRequests");
        }
    }
}
