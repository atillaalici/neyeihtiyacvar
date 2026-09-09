using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProviderApplicationsAndWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProviderApplications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BusinessName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ShortDescription = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    CategorySlug = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ServiceSlug = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    CitySlug = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DistrictSlug = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ApplicantName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Phone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Whatsapp = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    Note = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ReviewNote = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ReviewedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderApplications", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Providers_SourceApplicationId",
                table: "Providers",
                column: "SourceApplicationId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProviderApplications_CreatedAtUtc",
                table: "ProviderApplications",
                column: "CreatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderApplications_Status",
                table: "ProviderApplications",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProviderApplications");

            migrationBuilder.DropIndex(
                name: "IX_Providers_SourceApplicationId",
                table: "Providers");
        }
    }
}
