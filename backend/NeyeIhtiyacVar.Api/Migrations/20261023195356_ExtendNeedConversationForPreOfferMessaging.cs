using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class ExtendNeedConversationForPreOfferMessaging : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "ProviderOfferId",
                table: "NeedConversations",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "NeedRequestId",
                table: "NeedConversations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ProviderId",
                table: "NeedConversations",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "NeedConversations" AS c
                SET "NeedRequestId" = o."NeedRequestId",
                    "ProviderId" = o."ProviderId"
                FROM "ProviderOffers" AS o
                WHERE c."ProviderOfferId" = o."Id";
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "NeedRequestId",
                table: "NeedConversations",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "ProviderId",
                table: "NeedConversations",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_NeedConversations_NeedRequestId_ProviderId",
                table: "NeedConversations",
                columns: new[] { "NeedRequestId", "ProviderId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NeedConversations_ProviderId",
                table: "NeedConversations",
                column: "ProviderId");

            migrationBuilder.AddForeignKey(
                name: "FK_NeedConversations_NeedRequests_NeedRequestId",
                table: "NeedConversations",
                column: "NeedRequestId",
                principalTable: "NeedRequests",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_NeedConversations_Providers_ProviderId",
                table: "NeedConversations",
                column: "ProviderId",
                principalTable: "Providers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NeedConversations_NeedRequests_NeedRequestId",
                table: "NeedConversations");

            migrationBuilder.DropForeignKey(
                name: "FK_NeedConversations_Providers_ProviderId",
                table: "NeedConversations");

            migrationBuilder.DropIndex(
                name: "IX_NeedConversations_NeedRequestId_ProviderId",
                table: "NeedConversations");

            migrationBuilder.DropIndex(
                name: "IX_NeedConversations_ProviderId",
                table: "NeedConversations");

            migrationBuilder.DropColumn(
                name: "NeedRequestId",
                table: "NeedConversations");

            migrationBuilder.DropColumn(
                name: "ProviderId",
                table: "NeedConversations");

            migrationBuilder.AlterColumn<Guid>(
                name: "ProviderOfferId",
                table: "NeedConversations",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
