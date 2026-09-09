using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddNeedTrackingExpiry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "TrackingExpiresAtUtc",
                table: "NeedRequests",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "TrackingReminderSentAtUtc",
                table: "NeedRequests",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_NeedRequests_TrackingExpiresAtUtc",
                table: "NeedRequests",
                column: "TrackingExpiresAtUtc");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_NeedRequests_TrackingExpiresAtUtc",
                table: "NeedRequests");

            migrationBuilder.DropColumn(
                name: "TrackingExpiresAtUtc",
                table: "NeedRequests");

            migrationBuilder.DropColumn(
                name: "TrackingReminderSentAtUtc",
                table: "NeedRequests");
        }
    }
}
