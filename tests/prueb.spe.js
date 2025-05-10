const {test,expect} = require('@playwright/test')

test.beforeEach(async ({page})=>{
    await page.goto('http://localhost:3000')

})

test.describe('prueba',()=>{
    test('descripcion',async({page})=>{
        //await page.getByLabel('boton-ver-ventas',{exact:true}).click()
        //await page.getByLabel('boton-ver-ventas').waitFor()
        await page.locator('button#b').click()
        const titulo=await page.locator('h5#titulo').innerHTML()
        await expect(titulo).toBe('Ventas ($)')

        await page.route('http://localhost:3000/json/sales.json', async (route) => {
            const response = await route.fetch();
            const json = await response.json();
          
            // Aquí validas los datos como quieras
            expect(json.data.length).toBeGreaterThan(0)
          
    })
})
})