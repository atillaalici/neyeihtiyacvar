using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddNeedJobs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NeedJobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    NeedRequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderOfferId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    AcceptedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ProviderCompletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CustomerConfirmedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DisputedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AutoFinalizedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DisputeReason = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NeedJobs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NeedJobs_NeedRequests_NeedRequestId",
                        column: x => x.NeedRequestId,
                        principalTable: "NeedRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NeedJobs_ProviderOffers_ProviderOfferId",
                        column: x => x.ProviderOfferId,
                        principalTable: "ProviderOffers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NeedJobs_Providers_ProviderId",
                        column: x => x.ProviderId,
                        principalTable: "Providers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NeedJobs_NeedRequestId",
                table: "NeedJobs",
                column: "NeedRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_NeedJobs_ProviderId",
                table: "NeedJobs",
                column: "ProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_NeedJobs_ProviderOfferId",
                table: "NeedJobs",
                column: "ProviderOfferId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NeedJobs_Status",
                table: "NeedJobs",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NeedJobs");
        }
    }
}
