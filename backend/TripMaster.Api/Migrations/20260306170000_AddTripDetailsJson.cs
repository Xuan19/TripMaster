using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using TripMaster.Api.Data;

#nullable disable

namespace TripMaster.Api.Migrations
{
    [DbContext(typeof(TripMasterDbContext))]
    [Migration("20260306170000_AddTripDetailsJson")]
    /// <inheritdoc />
    public partial class AddTripDetailsJson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DetailsJson",
                table: "Trips",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DetailsJson",
                table: "Trips");
        }
    }
}
