using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProviderWorkAndNeedWorkRelations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CategoryLibraryWorkId",
                table: "NeedRequests",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ProviderCategoryLibraryWorks",
                columns: table => new
                {
                    ProviderId = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryLibraryWorkId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderCategoryLibraryWorks", x => new { x.ProviderId, x.CategoryLibraryWorkId });
                    table.ForeignKey(
                        name: "FK_ProviderCategoryLibraryWorks_CategoryLibraryWorks_CategoryL~",
                        column: x => x.CategoryLibraryWorkId,
                        principalTable: "CategoryLibraryWorks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProviderCategoryLibraryWorks_Providers_ProviderId",
                        column: x => x.ProviderId,
                        principalTable: "Providers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NeedRequests_CategoryLibraryWorkId",
                table: "NeedRequests",
                column: "CategoryLibraryWorkId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderCategoryLibraryWorks_CategoryLibraryWorkId",
                table: "ProviderCategoryLibraryWorks",
                column: "CategoryLibraryWorkId");

            migrationBuilder.AddForeignKey(
                name: "FK_NeedRequests_CategoryLibraryWorks_CategoryLibraryWorkId",
                table: "NeedRequests",
                column: "CategoryLibraryWorkId",
                principalTable: "CategoryLibraryWorks",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NeedRequests_CategoryLibraryWorks_CategoryLibraryWorkId",
                table: "NeedRequests");

            migrationBuilder.DropTable(
                name: "ProviderCategoryLibraryWorks");

            migrationBuilder.DropIndex(
                name: "IX_NeedRequests_CategoryLibraryWorkId",
                table: "NeedRequests");

            migrationBuilder.DropColumn(
                name: "CategoryLibraryWorkId",
                table: "NeedRequests");
        }
    }
}
