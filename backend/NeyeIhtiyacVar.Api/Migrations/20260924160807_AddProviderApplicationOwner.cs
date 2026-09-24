using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProviderApplicationOwner : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "OwnerUserId",
                table: "ProviderApplications",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProviderApplications_OwnerUserId",
                table: "ProviderApplications",
                column: "OwnerUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_ProviderApplications_Users_OwnerUserId",
                table: "ProviderApplications",
                column: "OwnerUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProviderApplications_Users_OwnerUserId",
                table: "ProviderApplications");

            migrationBuilder.DropIndex(
                name: "IX_ProviderApplications_OwnerUserId",
                table: "ProviderApplications");

            migrationBuilder.DropColumn(
                name: "OwnerUserId",
                table: "ProviderApplications");
        }
    }
}
