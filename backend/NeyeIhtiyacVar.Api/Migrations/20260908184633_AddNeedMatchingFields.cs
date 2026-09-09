using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddNeedMatchingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CategorySlug",
                table: "NeedRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CitySlug",
                table: "NeedRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DistrictSlug",
                table: "NeedRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ServiceSlug",
                table: "NeedRequests",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CategorySlug",
                table: "NeedRequests");

            migrationBuilder.DropColumn(
                name: "CitySlug",
                table: "NeedRequests");

            migrationBuilder.DropColumn(
                name: "DistrictSlug",
                table: "NeedRequests");

            migrationBuilder.DropColumn(
                name: "ServiceSlug",
                table: "NeedRequests");
        }
    }
}
