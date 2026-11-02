using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMessageDeletionFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedForEveryoneAtUtc",
                table: "NeedMessages",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedForRecipientAtUtc",
                table: "NeedMessages",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedForSenderAtUtc",
                table: "NeedMessages",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedForEveryoneAtUtc",
                table: "Messages",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedForRecipientAtUtc",
                table: "Messages",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedForSenderAtUtc",
                table: "Messages",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeletedForEveryoneAtUtc",
                table: "NeedMessages");

            migrationBuilder.DropColumn(
                name: "DeletedForRecipientAtUtc",
                table: "NeedMessages");

            migrationBuilder.DropColumn(
                name: "DeletedForSenderAtUtc",
                table: "NeedMessages");

            migrationBuilder.DropColumn(
                name: "DeletedForEveryoneAtUtc",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "DeletedForRecipientAtUtc",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "DeletedForSenderAtUtc",
                table: "Messages");
        }
    }
}
