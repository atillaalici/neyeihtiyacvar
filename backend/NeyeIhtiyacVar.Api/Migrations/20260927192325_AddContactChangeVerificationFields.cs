using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddContactChangeVerificationFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PendingPhoneNumber",
                table: "AccountVerificationCodes",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PendingWhatsAppNumber",
                table: "AccountVerificationCodes",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PendingPhoneNumber",
                table: "AccountVerificationCodes");

            migrationBuilder.DropColumn(
                name: "PendingWhatsAppNumber",
                table: "AccountVerificationCodes");
        }
    }
}
