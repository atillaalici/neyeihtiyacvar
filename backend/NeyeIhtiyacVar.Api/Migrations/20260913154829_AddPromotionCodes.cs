using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPromotionCodes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PromotionCodes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    DiscountType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DiscountValue = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    PlanCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    MaxUses = table.Column<int>(type: "integer", nullable: true),
                    UsedCount = table.Column<int>(type: "integer", nullable: false),
                    StartsAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PromotionCodes", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PromotionCodes_Code",
                table: "PromotionCodes",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PromotionCodes_IsActive_ExpiresAtUtc",
                table: "PromotionCodes",
                columns: new[] { "IsActive", "ExpiresAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PromotionCodes");
        }
    }
}
