using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class PromotionInstitutionsAndUsage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CampaignId",
                table: "PromotionCodes",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UsedAtUtc",
                table: "PromotionCodes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UsedByUserId",
                table: "PromotionCodes",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PromotionOrganizations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    Type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ContactName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    ContactEmail = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PromotionOrganizations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PromotionCampaigns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    CodePrefix = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    DiscountType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DiscountValue = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    PlanCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    StartsAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PromotionCampaigns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PromotionCampaigns_PromotionOrganizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "PromotionOrganizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PromotionUsages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PromotionCodeId = table.Column<Guid>(type: "uuid", nullable: false),
                    CampaignId = table.Column<Guid>(type: "uuid", nullable: true),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    UserDisplayName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    UserEmail = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: true),
                    PlanCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    OriginalPrice = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    FinalPrice = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    PaymentStatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    UsedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PromotionUsages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PromotionUsages_PromotionCampaigns_CampaignId",
                        column: x => x.CampaignId,
                        principalTable: "PromotionCampaigns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PromotionUsages_PromotionCodes_PromotionCodeId",
                        column: x => x.PromotionCodeId,
                        principalTable: "PromotionCodes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PromotionUsages_PromotionOrganizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "PromotionOrganizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PromotionUsages_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PromotionCodes_CampaignId",
                table: "PromotionCodes",
                column: "CampaignId");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionCodes_CampaignId_UsedCount",
                table: "PromotionCodes",
                columns: new[] { "CampaignId", "UsedCount" });

            migrationBuilder.CreateIndex(
                name: "IX_PromotionCodes_UsedByUserId",
                table: "PromotionCodes",
                column: "UsedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionCampaigns_IsActive_ExpiresAtUtc",
                table: "PromotionCampaigns",
                columns: new[] { "IsActive", "ExpiresAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_PromotionCampaigns_OrganizationId",
                table: "PromotionCampaigns",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionOrganizations_Name",
                table: "PromotionOrganizations",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionUsages_CampaignId",
                table: "PromotionUsages",
                column: "CampaignId");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionUsages_OrganizationId",
                table: "PromotionUsages",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionUsages_PaymentStatus",
                table: "PromotionUsages",
                column: "PaymentStatus");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionUsages_PromotionCodeId",
                table: "PromotionUsages",
                column: "PromotionCodeId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PromotionUsages_UsedAtUtc",
                table: "PromotionUsages",
                column: "UsedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_PromotionUsages_UserId",
                table: "PromotionUsages",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_PromotionCodes_PromotionCampaigns_CampaignId",
                table: "PromotionCodes",
                column: "CampaignId",
                principalTable: "PromotionCampaigns",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PromotionCodes_Users_UsedByUserId",
                table: "PromotionCodes",
                column: "UsedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PromotionCodes_PromotionCampaigns_CampaignId",
                table: "PromotionCodes");

            migrationBuilder.DropForeignKey(
                name: "FK_PromotionCodes_Users_UsedByUserId",
                table: "PromotionCodes");

            migrationBuilder.DropTable(
                name: "PromotionUsages");

            migrationBuilder.DropTable(
                name: "PromotionCampaigns");

            migrationBuilder.DropTable(
                name: "PromotionOrganizations");

            migrationBuilder.DropIndex(
                name: "IX_PromotionCodes_CampaignId",
                table: "PromotionCodes");

            migrationBuilder.DropIndex(
                name: "IX_PromotionCodes_CampaignId_UsedCount",
                table: "PromotionCodes");

            migrationBuilder.DropIndex(
                name: "IX_PromotionCodes_UsedByUserId",
                table: "PromotionCodes");

            migrationBuilder.DropColumn(
                name: "CampaignId",
                table: "PromotionCodes");

            migrationBuilder.DropColumn(
                name: "UsedAtUtc",
                table: "PromotionCodes");

            migrationBuilder.DropColumn(
                name: "UsedByUserId",
                table: "PromotionCodes");
        }
    }
}
