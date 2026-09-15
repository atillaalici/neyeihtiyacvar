using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProviderMemberships : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProviderMemberships",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderMemberships", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProviderMemberships_Providers_ProviderId",
                        column: x => x.ProviderId,
                        principalTable: "Providers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProviderMemberships_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProviderMemberships_IsActive",
                table: "ProviderMemberships",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderMemberships_ProviderId",
                table: "ProviderMemberships",
                column: "ProviderId",
                unique: true,
                filter: "\"IsActive\" = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderMemberships_ProviderId_UserId",
                table: "ProviderMemberships",
                columns: new[] { "ProviderId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProviderMemberships_UserId",
                table: "ProviderMemberships",
                column: "UserId",
                unique: true,
                filter: "\"IsActive\" = TRUE");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProviderMemberships");
        }
    }
}
