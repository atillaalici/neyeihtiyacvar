using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProviderApplicationMapLocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "ProviderApplications",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "ProviderApplications",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PublicAddress",
                table: "ProviderApplications",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "ProviderApplications");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "ProviderApplications");

            migrationBuilder.DropColumn(
                name: "PublicAddress",
                table: "ProviderApplications");
        }
    }
}
