using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddContactReplies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ContactReplies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContactRequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    AdminUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Message = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    EmailProviderMessageId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContactReplies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContactReplies_ContactRequests_ContactRequestId",
                        column: x => x.ContactRequestId,
                        principalTable: "ContactRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ContactReplies_Users_AdminUserId",
                        column: x => x.AdminUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ContactReplies_AdminUserId",
                table: "ContactReplies",
                column: "AdminUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ContactReplies_ContactRequestId",
                table: "ContactReplies",
                column: "ContactRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_ContactReplies_CreatedAtUtc",
                table: "ContactReplies",
                column: "CreatedAtUtc");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContactReplies");
        }
    }
}
