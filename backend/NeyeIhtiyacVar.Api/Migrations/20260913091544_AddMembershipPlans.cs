using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMembershipPlans : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AnnualPriceSnapshot",
                table: "ProviderMemberships",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpiresAtUtc",
                table: "ProviderMemberships",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PlanId",
                table: "ProviderMemberships",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ServiceLimitSnapshot",
                table: "ProviderMemberships",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "StartsAtUtc",
                table: "ProviderMemberships",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAtUtc",
                table: "ProviderMemberships",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateTable(
                name: "MembershipPlans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    AnnualPrice = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    ServiceLimit = table.Column<int>(type: "integer", nullable: false),
                    IsRecommended = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    MapVisibility = table.Column<bool>(type: "boolean", nullable: false),
                    PhotoEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    VideoEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    FeaturedBadgeEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    SearchPriorityEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    AdvancedStatisticsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    CatalogCampaignEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    PrioritySupportEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MembershipPlans", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderMemberships_PlanId",
                table: "ProviderMemberships",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_MembershipPlans_Code",
                table: "MembershipPlans",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MembershipPlans_IsActive_SortOrder",
                table: "MembershipPlans",
                columns: new[] { "IsActive", "SortOrder" });

            migrationBuilder.AddForeignKey(
                name: "FK_ProviderMemberships_MembershipPlans_PlanId",
                table: "ProviderMemberships",
                column: "PlanId",
                principalTable: "MembershipPlans",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProviderMemberships_MembershipPlans_PlanId",
                table: "ProviderMemberships");

            migrationBuilder.DropTable(
                name: "MembershipPlans");

            migrationBuilder.DropIndex(
                name: "IX_ProviderMemberships_PlanId",
                table: "ProviderMemberships");

            migrationBuilder.DropColumn(
                name: "AnnualPriceSnapshot",
                table: "ProviderMemberships");

            migrationBuilder.DropColumn(
                name: "ExpiresAtUtc",
                table: "ProviderMemberships");

            migrationBuilder.DropColumn(
                name: "PlanId",
                table: "ProviderMemberships");

            migrationBuilder.DropColumn(
                name: "ServiceLimitSnapshot",
                table: "ProviderMemberships");

            migrationBuilder.DropColumn(
                name: "StartsAtUtc",
                table: "ProviderMemberships");

            migrationBuilder.DropColumn(
                name: "UpdatedAtUtc",
                table: "ProviderMemberships");
        }
    }
}
