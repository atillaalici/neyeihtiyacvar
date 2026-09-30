using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProviderInteractionReviews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "NeedRequestId",
                table: "ProviderReviews",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "ProviderInteractionId",
                table: "ProviderReviews",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProviderReviews_ProviderInteractionId",
                table: "ProviderReviews",
                column: "ProviderInteractionId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_ProviderReviews_ProviderInteractions_ProviderInteractionId",
                table: "ProviderReviews",
                column: "ProviderInteractionId",
                principalTable: "ProviderInteractions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProviderReviews_ProviderInteractions_ProviderInteractionId",
                table: "ProviderReviews");

            migrationBuilder.DropIndex(
                name: "IX_ProviderReviews_ProviderInteractionId",
                table: "ProviderReviews");

            migrationBuilder.DropColumn(
                name: "ProviderInteractionId",
                table: "ProviderReviews");

            migrationBuilder.AlterColumn<Guid>(
                name: "NeedRequestId",
                table: "ProviderReviews",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
