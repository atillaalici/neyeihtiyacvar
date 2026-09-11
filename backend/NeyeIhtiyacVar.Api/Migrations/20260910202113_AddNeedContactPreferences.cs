using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddNeedContactPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ContactByEmail",
                table: "NeedRequests",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ContactByPhone",
                table: "NeedRequests",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ContactByPush",
                table: "NeedRequests",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ContactByWhatsapp",
                table: "NeedRequests",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContactByEmail",
                table: "NeedRequests");

            migrationBuilder.DropColumn(
                name: "ContactByPhone",
                table: "NeedRequests");

            migrationBuilder.DropColumn(
                name: "ContactByPush",
                table: "NeedRequests");

            migrationBuilder.DropColumn(
                name: "ContactByWhatsapp",
                table: "NeedRequests");
        }
    }
}
