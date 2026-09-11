using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTargetedNeedContactFlow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "NotifyByEmail",
                table: "Providers",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "NotifyByPush",
                table: "Providers",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "NotifyBySms",
                table: "Providers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "NotifyByWhatsapp",
                table: "Providers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "TargetProviderId",
                table: "NeedRequests",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_NeedRequests_TargetProviderId",
                table: "NeedRequests",
                column: "TargetProviderId");

            migrationBuilder.AddForeignKey(
                name: "FK_NeedRequests_Providers_TargetProviderId",
                table: "NeedRequests",
                column: "TargetProviderId",
                principalTable: "Providers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NeedRequests_Providers_TargetProviderId",
                table: "NeedRequests");

            migrationBuilder.DropIndex(
                name: "IX_NeedRequests_TargetProviderId",
                table: "NeedRequests");

            migrationBuilder.DropColumn(
                name: "NotifyByEmail",
                table: "Providers");

            migrationBuilder.DropColumn(
                name: "NotifyByPush",
                table: "Providers");

            migrationBuilder.DropColumn(
                name: "NotifyBySms",
                table: "Providers");

            migrationBuilder.DropColumn(
                name: "NotifyByWhatsapp",
                table: "Providers");

            migrationBuilder.DropColumn(
                name: "TargetProviderId",
                table: "NeedRequests");
        }
    }
}
