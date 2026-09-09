using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProviders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Providers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SourceApplicationId = table.Column<Guid>(type: "uuid", nullable: true),
                    Slug = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    BusinessName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ShortDescription = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Description = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    CategorySlug = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ServiceSlug = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    AdditionalServices = table.Column<string[]>(type: "text[]", nullable: false),
                    CitySlug = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DistrictSlug = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PublicPhone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    PublicWhatsapp = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    PublicAddress = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    WorkingHours = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ExperienceYears = table.Column<int>(type: "integer", nullable: true),
                    EmergencyService = table.Column<bool>(type: "boolean", nullable: false),
                    OnsiteService = table.Column<bool>(type: "boolean", nullable: false),
                    PublicationStatus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PublishedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PublishedBy = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Providers", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Providers_CategorySlug_ServiceSlug",
                table: "Providers",
                columns: new[] { "CategorySlug", "ServiceSlug" });

            migrationBuilder.CreateIndex(
                name: "IX_Providers_CitySlug_DistrictSlug",
                table: "Providers",
                columns: new[] { "CitySlug", "DistrictSlug" });

            migrationBuilder.CreateIndex(
                name: "IX_Providers_PublicationStatus",
                table: "Providers",
                column: "PublicationStatus");

            migrationBuilder.CreateIndex(
                name: "IX_Providers_Slug",
                table: "Providers",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Providers");
        }
    }
}
