using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddNeedPrivacyAndSystemMessaging : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ContactBySystemMessage",
                table: "NeedRequests",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ContactPreferencesSet",
                table: "NeedRequests",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ShowFullName",
                table: "NeedRequests",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContactBySystemMessage",
                table: "NeedRequests");

            migrationBuilder.DropColumn(
                name: "ContactPreferencesSet",
                table: "NeedRequests");

            migrationBuilder.DropColumn(
                name: "ShowFullName",
                table: "NeedRequests");
        }
    }
}
